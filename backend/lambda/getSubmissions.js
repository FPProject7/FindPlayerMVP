const { Client } = require('pg');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Helper to extract S3 key from a full S3 URL
function extractS3KeyFromUrl(url) {
  const match = url.match(/amazonaws\.com\/(.+)$/);
  return match ? match[1] : null;
}

exports.handler = async (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";
  const coachId = claims?.sub;  // Assuming sub is the coach ID

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    let query, values;
    if (groups.includes("coaches") || customRole === "coach") {
      query = `
        SELECT 
          s.*, 
          c.title AS challenge_title,
          u.name AS athlete_name,
          u.profile_picture_url AS athlete_profile_picture_url
        FROM challenge_submissions s
        JOIN challenges c ON s.challenge_id = c.id
        LEFT JOIN users u ON s.athlete_id = u.id::varchar
        WHERE c.coach_id = $1::text
          AND s.status = 'pending'
        ORDER BY s.submitted_at DESC
      `;
      values = [coachId];
    } else {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden: Invalid role" })
      };
    }

    const res = await client.query(query, values);
    await client.end();

    // For each submission, generate a pre-signed GET URL for the video
    const submissionsWithSignedUrl = await Promise.all(res.rows.map(async (row) => {
      let signedGetUrl = null;
      if (row.video_url) {
        const key = extractS3KeyFromUrl(row.video_url);
        if (key) {
          const getParams = {
            Bucket: 'challenge-videos-prod',
            Key: key,
            Expires: 600 // 10 minutes
          };
          signedGetUrl = await s3.getSignedUrlPromise('getObject', getParams);
        }
      }
      return {
        ...row,
        athlete_name: row.athlete_name || 'Unknown',
        signedGetUrl,
      };
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submissionsWithSignedUrl)
    };

  } catch (err) {
    console.error('DB error:', err);
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching submissions', error: err.message })
    };
  }
};
