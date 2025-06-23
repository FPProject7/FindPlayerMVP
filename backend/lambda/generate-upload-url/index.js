const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('=== GENERATE UPLOAD URL STARTED ===');
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight OPTIONS request
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
  
  try {
    const challengeId = event.queryStringParameters?.challengeId || "test";
    
    // Try to extract athlete ID from JWT token (optional)
    let athleteId = null;
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    
    if (claims) {
      athleteId = claims.sub;
    } else {
      // Fallback: Extract from Authorization header manually
      const authHeader = event.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          athleteId = payload.sub;
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError);
          // Don't fail - just continue without athlete ID
        }
      }
    }
    
    console.log('Extracted challengeId:', challengeId);
    console.log('Extracted athleteId:', athleteId);
    
    if (!challengeId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "Challenge ID is required" })
      };
    }
    
    // Use organized filename if athlete ID is available, otherwise use original format
    const fileName = athleteId 
      ? `challenges/${challengeId}/athletes/${athleteId}/${Date.now()}.mp4`
      : `challenge_${challengeId}/video_${Date.now()}.mp4`;
    
    console.log('Generated fileName:', fileName);
    
    const bucketName = process.env.BUCKET_NAME;
    
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Expires: 600, // 10 minutes
      ContentType: 'video/mp4'
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
    
    console.log('Generated upload URL successfully');
    console.log('File URL:', fileUrl);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        uploadUrl, 
        fileUrl,
        fileName,
        metadata: {
          challengeId,
          athleteId,
          timestamp: Date.now()
        }
      })
    };
  } catch (err) {
    console.error("S3 error:", err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        message: "Error generating upload URL", 
        error: err.message 
      })
    };
  }
};
