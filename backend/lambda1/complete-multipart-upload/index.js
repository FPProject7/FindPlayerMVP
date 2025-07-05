const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('=== COMPLETE MULTIPART UPLOAD STARTED ===');
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
    const { uploadId, fileName, parts } = JSON.parse(event.body);
    
    if (!uploadId || !fileName || !parts || !Array.isArray(parts)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "uploadId, fileName, and parts array are required" })
      };
    }
    
    const bucketName = process.env.BUCKET_NAME;
    
    // Validate parts array
    const validatedParts = parts.map(part => {
      if (!part.PartNumber || !part.ETag) {
        throw new Error(`Invalid part: missing PartNumber or ETag`);
      }
      return {
        PartNumber: parseInt(part.PartNumber),
        ETag: part.ETag
      };
    });
    
    // Sort parts by part number
    validatedParts.sort((a, b) => a.PartNumber - b.PartNumber);
    
    console.log('Completing multipart upload:', {
      bucketName,
      fileName,
      uploadId,
      partsCount: validatedParts.length
    });
    
    const completeParams = {
      Bucket: bucketName,
      Key: fileName,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: validatedParts
      }
    };
    
    const result = await s3.completeMultipartUpload(completeParams).promise();
    
    console.log('Multipart upload completed successfully');
    console.log('Result:', result);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Multipart upload completed successfully',
        fileUrl: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
        key: result.Key
      })
    };
    
  } catch (err) {
    console.error("Error completing multipart upload:", err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        message: "Error completing multipart upload", 
        error: err.message 
      })
    };
  }
}; 