const { Client } = require('pg');

exports.handler = async (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";

  if (!groups.includes("athletes") && customRole !== "athlete") {
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: "Forbidden: Only athletes can check submission status" })
    };
  }

  const challengeId = event.pathParameters.id;
  const athleteId = claims?.sub; // Get athlete ID from JWT claims

  if (!athleteId) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: "User ID not found in token" })
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check if user has already submitted for this challenge
    const query = `
      SELECT id, challenge_id, athlete_id, video_url, status, created_at, updated_at
      FROM challenge_submissions 
      WHERE challenge_id = $1 AND athlete_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await client.query(query, [challengeId, athleteId]);

    if (result.rows.length > 0) {
      const submission = result.rows[0];
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ 
          submission: {
            id: submission.id,
            challenge_id: submission.challenge_id,
            athlete_id: submission.athlete_id,
            video_url: submission.video_url,
            status: submission.status,
            created_at: submission.created_at,
            updated_at: submission.updated_at
          }
        })
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "No submission found for this challenge" })
      };
    }

  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: "Internal server error", error: error.message })
    };
  } finally {
    await client.end();
  }
}; 