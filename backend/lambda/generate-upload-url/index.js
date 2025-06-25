const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('=== GENERATE MULTIPART UPLOAD URL STARTED ===');
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
    const partNumber = parseInt(event.queryStringParameters?.partNumber) || 1;
    const uploadId = event.queryStringParameters?.uploadId;
    // URL decode the fileName parameter to handle URL-encoded query strings
    const fileName = event.queryStringParameters?.fileName ? decodeURIComponent(event.queryStringParameters.fileName) : null;
    
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
    console.log('Part number:', partNumber);
    console.log('Upload ID:', uploadId);
    console.log('File name:', fileName);
    
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
    
    const bucketName = process.env.BUCKET_NAME;
    
    let finalFileName = fileName;
    let response; // <-- Declare response in parent scope
    
    if (!uploadId) {
      // Step 1: Initiate multipart upload
      console.log('Initiating multipart upload...');
      
      // Generate new fileName only for initiation
      finalFileName = athleteId 
        ? `challenges/${challengeId}/athletes/${athleteId}/${Date.now()}.mp4`
        : `challenge_${challengeId}/video_${Date.now()}.mp4`;
      
      console.log('Generated fileName for initiation:', finalFileName);
      
      const initiateParams = {
        Bucket: bucketName,
        Key: finalFileName,
        ContentType: 'video/mp4',
        ACL: 'bucket-owner-full-control'
      };
      
      const multipartUpload = await s3.createMultipartUpload(initiateParams).promise();
      
      response = {
        uploadId: multipartUpload.UploadId,
        fileName: finalFileName,
        fileUrl: `https://${bucketName}.s3.amazonaws.com/${finalFileName}`,
        metadata: {
          challengeId,
          athleteId,
          timestamp: Date.now(),
          action: 'initiated'
        }
      };
      
      console.log('Multipart upload initiated with ID:', multipartUpload.UploadId);
      
    } else {
      // Step 2: Generate presigned URL for part upload
      console.log('Generating presigned URL for part', partNumber);
      
      // Use the provided fileName for part uploads
      if (!fileName) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          },
          body: JSON.stringify({ message: "fileName is required for part uploads" })
        };
      }
      
      const partParams = {
        Bucket: bucketName,
        Key: fileName,
        PartNumber: partNumber,
        UploadId: uploadId,
        Expires: 3600 // 1 hour for part uploads
      };
      
      const uploadUrl = await s3.getSignedUrlPromise('uploadPart', partParams);
      
      response = {
        uploadUrl,
        partNumber,
        uploadId,
        fileName,
        fileUrl: `https://${bucketName}.s3.amazonaws.com/${fileName}`,
        metadata: {
          challengeId,
          athleteId,
          timestamp: Date.now(),
          action: 'part_upload'
        }
      };
      
      console.log('Generated upload URL for part', partNumber);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
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
        message: "Error generating multipart upload URL", 
        error: err.message 
      })
    };
  }
};
