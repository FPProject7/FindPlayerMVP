const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const EVENT_IMAGES_BUCKET = process.env.EVENT_IMAGES_BUCKET || 'findplayer-event-images-325298451465';

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));
  
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    console.error("Unauthorized: No userId in event.requestContext.authorizer.claims");
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType } = body;
    
    if (!fileName || !contentType) {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
        body: JSON.stringify({ error: 'fileName and contentType are required' }) 
      };
    }

    // Generate unique file name to prevent conflicts
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${userId}/${uuidv4()}.${fileExtension}`;
    
    // Generate pre-signed URL for upload
    const uploadParams = {
      Bucket: EVENT_IMAGES_BUCKET,
      Key: uniqueFileName,
      ContentType: contentType,
      Expires: 300, // 5 minutes
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', uploadParams);
    
    // Generate a public URL for the uploaded image
    const publicUrl = `https://${EVENT_IMAGES_BUCKET}.s3.amazonaws.com/${uniqueFileName}`;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
      body: JSON.stringify({
        uploadUrl,
        publicUrl,
        fileName: uniqueFileName,
        expiresIn: 300
      })
    };
  } catch (err) {
    console.error("Error in generate-event-image-url:", err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 