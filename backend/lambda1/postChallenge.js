const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { Client } = require('pg');

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REGION = process.env.REGION || 'us-east-1';

exports.handler = async (event) => {
  // Extract claims
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
const groups = claims?.["cognito:groups"] || [];
const customRole = claims?.["custom:role"] || "";

const isCoachGroup = groups.includes("coaches");
const isCoachRole = customRole === "coach";

if (!isCoachGroup && !isCoachRole) {
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


  const body = JSON.parse(event.body);
  const { title, description, xp_value, imageBase64, imageContentType } = body;
  const coachId = claims?.sub; // Get coach ID from JWT claims

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
      await s3.upload(s3UploadParams).promise();
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

  try {
    await client.connect();

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
