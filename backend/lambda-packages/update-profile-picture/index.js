const { Client } = require('pg');
const AWS = require('aws-sdk');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

const REGION = process.env.REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

const s3 = new AWS.S3({ region: REGION });
const cognito = new AWS.CognitoIdentityServiceProvider({ region: REGION });

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const method = event.requestContext?.http?.method;

  // Handle OPTIONS request (CORS preflight)
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    console.log('Request method:', method);
    console.log('Request body:', event.body);
    console.log('Request context:', JSON.stringify(event.requestContext, null, 2));
    
    // Extract user ID from JWT claims (API Gateway authorizer must be set up)
    let userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    
    // If no userId from authorizer, try to get it from request body (fallback)
    if (!userId) {
      const body = JSON.parse(event.body || '{}');
      userId = body.userId;
      
      if (!userId) {
        console.log('No userId found in authorizer or request body');
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Unauthorized: No user ID found in token or request body.' })
        };
      }
      console.log('User ID from request body (fallback):', userId);
    } else {
      console.log('User ID from authorizer:', userId);
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { profilePictureBase64, profilePictureContentType } = body;
    
    console.log('Request body parsed:', {
      hasProfilePictureBase64: !!profilePictureBase64,
      profilePictureContentType,
      userId
    });

    // Validate required fields
    if (!profilePictureBase64) {
      console.log('Missing profilePictureBase64');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'profilePictureBase64 is required' })
      };
    }

    if (!profilePictureContentType) {
      console.log('Missing profilePictureContentType');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'profilePictureContentType is required' })
      };
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(profilePictureContentType)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid content type. Allowed types: image/jpeg, image/png, image/gif, image/webp' })
      };
    }

    // Validate file size (2MB limit)
    const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    const base64Size = profilePictureBase64.length;
    const estimatedFileSize = Math.ceil((base64Size * 3) / 4); // Base64 to binary size conversion
    
    if (estimatedFileSize > MAX_FILE_SIZE_BYTES) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `File size exceeds 2MB limit. Please choose a smaller image.` })
      };
    }

    // Connect to database to get user email
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Get user's current profile picture URL and email
    const userQuery = `
      SELECT email, profile_picture_url 
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await client.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = userResult.rows[0];
    const oldProfilePictureUrl = user.profile_picture_url;
    const userEmail = user.email;

    // Upload new profile picture to S3
    let newProfilePictureUrl = null;
    try {
      const contentType = profilePictureContentType;
      const base64Data = profilePictureBase64;
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Generate a unique file name
      const fileExtension = contentType.split('/')[1] || 'jpeg';
      const s3Key = `profile-pictures/${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExtension}`;

      const s3UploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: contentType,
      };

      await s3.putObject(s3UploadParams).promise();

      newProfilePictureUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
      console.log(`New profile picture uploaded to S3: ${newProfilePictureUrl}`);

    } catch (s3Error) {
      console.error('Error uploading profile picture to S3:', s3Error);
      await client.end();
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to upload profile picture to S3' })
      };
    }

    // Update database with new profile picture URL
    try {
      const updateQuery = `
        UPDATE users 
        SET profile_picture_url = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id, profile_picture_url, updated_at
      `;
      
      const result = await client.query(updateQuery, [newProfilePictureUrl, userId]);
      await client.end();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'User not found during update' })
        };
      }

    } catch (dbError) {
      console.error('Error updating database:', dbError);
      await client.end();
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to update database' })
      };
    }

    // Update Cognito User Attributes with new Profile Picture URL
    try {
      const updateUserAttributesParams = {
        UserPoolId: USER_POOL_ID,
        Username: userEmail,
        UserAttributes: [
          { Name: "custom:profilePictureUrl", Value: newProfilePictureUrl }
        ],
      };
      await cognito.adminUpdateUserAttributes(updateUserAttributesParams).promise();
      console.log(`Cognito user attributes updated with new profile picture URL for ${userEmail}`);

    } catch (cognitoError) {
      console.error('Error updating Cognito attributes:', cognitoError);
      // Don't fail the request if Cognito update fails, but log it
    }

    // Delete old profile picture from S3 if it exists
    if (oldProfilePictureUrl && oldProfilePictureUrl.includes(S3_BUCKET_NAME)) {
      try {
        const oldS3Key = oldProfilePictureUrl.split('.com/')[1];
        if (oldS3Key) {
          const deleteParams = {
            Bucket: S3_BUCKET_NAME,
            Key: oldS3Key,
          };
          await s3.deleteObject(deleteParams).promise();
          console.log(`Old profile picture deleted from S3: ${oldS3Key}`);
        }
      } catch (deleteError) {
        console.error('Error deleting old profile picture from S3:', deleteError);
        // Don't fail the request if old picture deletion fails
      }
    }

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Profile picture updated successfully',
        userId: userId,
        profilePictureUrl: newProfilePictureUrl,
        updatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error updating profile picture:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
}; 