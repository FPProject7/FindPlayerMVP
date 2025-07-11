const { Client } = require('pg');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REGION = process.env.REGION || 'us-east-1';

exports.handler = async (event) => {
  // Handle OPTIONS requests for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { userId, content, imageBase64, imageContentType, videoBase64, videoContentType } = body;

    if (!userId || !content) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ message: 'userId and content are required' })
      };
    }

    let imageUrl = null;
    let videoUrl = null;

    // Handle image upload if provided
    if (imageBase64 && imageContentType && S3_BUCKET_NAME) {
      try {
        // Validate image size (max 2MB)
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        if (imageBuffer.length > 2 * 1024 * 1024) {
          return {
            statusCode: 400,
            headers: { 
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ message: "Image file size exceeds 2MB." })
          };
        }

        // Generate unique file name in the new posts/ structure
        const fileExtension = imageContentType.split('/')[1] || 'jpeg';
        const s3Key = `posts/${userId}/${Date.now()}-image.${fileExtension}`;
        const s3UploadParams = {
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: imageContentType
        };
        await s3.upload(s3UploadParams).promise();
        imageUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
        console.log(`Post image uploaded to S3: ${imageUrl}`);
      } catch (err) {
        console.error("Error uploading post image to S3:", err);
        imageUrl = null;
      }
    }

    // Handle video upload if provided
    if (videoBase64 && videoContentType) {
      try {
        // If videoBase64 is a URL (from multipart upload), use as-is
        if (videoBase64.startsWith('http')) {
          videoUrl = videoBase64;
          console.log(`Post video URL from multipart upload: ${videoUrl}`);
        } else if (S3_BUCKET_NAME) {
          // It's base64, upload it to S3 using the new posts/ structure
          const videoBuffer = Buffer.from(videoBase64, 'base64');
          if (videoBuffer.length > 50 * 1024 * 1024) {
            return {
              statusCode: 400,
              headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
              },
              body: JSON.stringify({ message: "Video file size exceeds 50MB." })
            };
          }
          const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
          if (!allowedVideoTypes.includes(videoContentType)) {
            return {
              statusCode: 400,
              headers: { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
              },
              body: JSON.stringify({ message: "Unsupported video format. Please use MP4, WebM, or MOV." })
            };
          }
          const fileExtension = videoContentType.split('/')[1] || 'mp4';
          const s3Key = `posts/${userId}/${Date.now()}-video.${fileExtension}`;
          const s3UploadParams = {
            Bucket: S3_BUCKET_NAME,
            Key: s3Key,
            Body: videoBuffer,
            ContentType: videoContentType
          };
          await s3.upload(s3UploadParams).promise();
          videoUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
          console.log(`Post video uploaded to S3: ${videoUrl}`);
        }
      } catch (err) {
        console.error("Error handling post video:", err);
        videoUrl = null;
      }
    }

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Insert the post with video_url support
    const insertQuery = `
      INSERT INTO posts (user_id, content, image_url, video_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, content, image_url, video_url, created_at
    `;
    
    const result = await client.query(insertQuery, [userId, content, imageUrl, videoUrl]);
    
    await client.end();

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Post created successfully',
        post: {
          ...result.rows[0],
          video_url: videoUrl || result.rows[0].video_url || null
        }
      })
    };

  } catch (error) {
    console.error('Error creating post:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
}; 