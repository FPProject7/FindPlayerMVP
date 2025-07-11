const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('=== GENERATE POST MULTIPART UPLOAD URL STARTED ===');
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
    const postType = event.queryStringParameters?.postType || "post";
    const partNumber = parseInt(event.queryStringParameters?.partNumber) || 1;
    const uploadId = event.queryStringParameters?.uploadId;
    // URL decode the fileName parameter to handle URL-encoded query strings
    const fileName = event.queryStringParameters?.fileName ? decodeURIComponent(event.queryStringParameters.fileName) : null;
    
    // Try to extract user ID from JWT token (optional)
    let userId = null;
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    
    if (claims) {
      userId = claims.sub;
    } else {
      // Fallback: Extract from Authorization header manually
      const authHeader = event.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub;
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError);
          // Don't fail - just continue without user ID
        }
      }
    }
    
    console.log('Extracted postType:', postType);
    console.log('Extracted userId:', userId);
    console.log('Part number:', partNumber);
    console.log('Upload ID:', uploadId);
    console.log('File name:', fileName);
    
    if (!postType) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "Post type is required" })
      };
    }
    
    const bucketName = process.env.BUCKET_NAME;
    
    let finalFileName = fileName;
    let response; // <-- Declare response in parent scope
    
    if (!uploadId) {
      // Step 1: Initiate multipart upload
      console.log('Initiating multipart upload for post...');
      
      // Generate new fileName only for initiation
      finalFileName = fileName || `posts/${userId}/${Date.now()}.mp4`;
      
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
          postType,
          userId,
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
          postType,
          userId,
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
