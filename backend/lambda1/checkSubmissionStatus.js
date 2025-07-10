const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('EVENT:', JSON.stringify(event, null, 2));
  if ((event.httpMethod && event.httpMethod.toUpperCase() === 'OPTIONS') || (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS')) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  let client;
  try {
    // Extract athleteId from JWT claims
    let athleteId = null;
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (claims) {
      athleteId = claims.sub;
    } else {
      // Fallback: Extract from Authorization header manually (if needed)
      const authHeader = event.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          athleteId = payload.sub;
        } catch (jwtError) {
          // Optionally log JWT error
        }
      }
    }

    // Get challengeId from query parameters and validate
    let challengeId = event.queryStringParameters?.id;
    challengeId = parseInt(challengeId, 10);
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
    if (isNaN(challengeId)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "Challenge ID must be an integer in query parameters" })
      };
    }

    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const query = `
      SELECT id, challenge_id, athlete_id, video_url, status, submitted_at, review_comment
      FROM challenge_submissions 
      WHERE challenge_id = $1 AND athlete_id = $2
      ORDER BY submitted_at DESC
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
        body: JSON.stringify({ submission })
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
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: "Database test failed", error: error.message, errorType: error.constructor.name })
    };
  } finally {
    if (client) await client.end();
  }
}; 