const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');

const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' });

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REGION = process.env.REGION || 'us-east-1';

exports.handler = async (event) => {
  console.log('Lambda - Function started');
  
  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  // Extract claims
  console.log('Lambda - Full event:', JSON.stringify(event, null, 2));
  
  // Try different possible claim locations
  const claims1 = event?.requestContext?.authorizer?.jwt?.claims;
  const claims2 = event?.requestContext?.authorizer?.claims;
  const claims3 = event?.requestContext?.authorizer;
  
  console.log('Lambda - Claims from jwt.claims:', claims1);
  console.log('Lambda - Claims from claims:', claims2);
  console.log('Lambda - Claims from authorizer:', claims3);
  
  // Use the first non-null claims object
  const claims = claims1 || claims2 || claims3 || {};
  
  console.log('Lambda - Final claims object:', claims);
  
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";
  
  console.log('Lambda - Groups:', groups);
  console.log('Lambda - Custom role:', customRole);
  
  const isCoachGroup = groups.includes("coaches");
  const isCoachRole = customRole === "coach";
  
  console.log('Lambda - Is coach group:', isCoachGroup);
  console.log('Lambda - Is coach role:', isCoachRole);
  
  // Allow if user has coach role OR is in coaches group
  if (!isCoachRole && !isCoachGroup) {
    console.log('Lambda - Authorization failed: User is not a coach');
    console.log('Lambda - User role:', customRole);
    console.log('Lambda - User groups:', groups);
    return {
      statusCode: 403,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Forbidden: Only coaches can create challenges"
      })
    };
  }
  
  console.log('Lambda - Authorization successful: User is a coach');

  // Parse request body with error handling
  let body;
  try {
    console.log('Lambda - Event body:', event.body);
    body = JSON.parse(event.body);
    console.log('Lambda - Parsed body:', body);
  } catch (error) {
    console.error('Lambda - Error parsing body:', error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }

  const { title, description, xp_value, imageBase64, imageContentType } = body;
  const coachId = claims?.sub; // Get coach ID from JWT claims
  
  console.log('Lambda - Extracted data:', { title, description, xp_value, coachId });

  let imageUrl = null;

  // Handle image upload if provided
  if (imageBase64 && imageContentType && S3_BUCKET_NAME) {
    try {
      // Validate image size (max 2MB)
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      if (imageBuffer.length > 2 * 1024 * 1024) {
        return {
          statusCode: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ message: "Image file size exceeds 2MB." })
        };
      }
      // Generate unique file name
      const fileExtension = imageContentType.split('/')[1] || 'jpeg';
      const s3Key = `challenge-images/${coachId}-${Date.now()}.${fileExtension}`;
      const s3UploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: imageContentType
      };
      await s3Client.send(new PutObjectCommand(s3UploadParams));
      imageUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
    } catch (err) {
      console.error("Error uploading challenge image to S3:", err);
      imageUrl = null;
    }
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Lambda - Database config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    hasPassword: !!process.env.DB_PASSWORD
  });

  try {
    console.log('Lambda - Connecting to database...');
    await client.connect();
    console.log('Lambda - Database connected successfully');

    const result = await client.query(
      'INSERT INTO challenges (title, description, xp_value, coach_id, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, xp_value, coachId, imageUrl]
    );

    await client.end();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: 'Challenge created successfully',
        challenge: result.rows[0],
      }),
    };
  } catch (err) {
    console.error('DB error:', err);
    await client.end();
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: 'Error creating challenge', error: err.message }),
    };
  }
}; 