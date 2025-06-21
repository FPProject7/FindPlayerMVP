const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  const challengeId = event.pathParameters?.id || "test";
  const fileName = `challenge_${challengeId}/video_${Date.now()}.mp4`;
  const bucketName = process.env.BUCKET_NAME;

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Expires: 600,
    ContentType: 'video/mp4'
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, fileUrl })
    };
  } catch (err) {
    console.error("S3 error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error generating upload URL", error: err.message })
    };
  }
};
