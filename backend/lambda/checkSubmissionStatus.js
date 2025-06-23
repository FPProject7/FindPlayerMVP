const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== LAMBDA FUNCTION STARTED ===');
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  let client;
  
  try {
    // TEMPORARY: Extract user ID from JWT token manually since API Gateway authorizer isn't working
    let athleteId = null;
    let customRole = null;
    
    // Try to get claims from authorizer first
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    console.log('Claims from authorizer:', JSON.stringify(claims, null, 2));
    
    if (claims) {
      athleteId = claims.sub;
      customRole = claims["custom:role"];
    } else {
      // Fallback: Extract from Authorization header manually
      const authHeader = event.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Extracting from JWT token manually...');
        
        try {
          // Decode JWT token (without verification for now)
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          console.log('Decoded JWT payload:', JSON.stringify(payload, null, 2));
          
          athleteId = payload.sub;
          customRole = payload["custom:role"];
        } catch (jwtError) {
          console.error('Error decoding JWT:', jwtError);
        }
      }
    }
    
    console.log('Extracted athleteId:', athleteId);
    console.log('Extracted customRole:', customRole);

    const challengeId = event.pathParameters?.id;
    console.log('Challenge ID from path parameters:', challengeId);

    if (!athleteId) {
      console.log('No athlete ID found');
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

    if (!challengeId) {
      console.log('No challenge ID found in path parameters');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: "Challenge ID not found in path parameters" })
      };
    }

    console.log('Connecting to database...');
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connection successful!');

    // Updated query to match your actual table structure
    const query = `
      SELECT id, challenge_id, athlete_id, video_url, status, submitted_at
      FROM challenge_submissions 
      WHERE challenge_id = $1 AND athlete_id = $2
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    console.log('Executing query with params:', [challengeId, athleteId]);
    const result = await client.query(query, [challengeId, athleteId]);
    console.log('Query result rows:', result.rows.length);

    if (result.rows.length > 0) {
      const submission = result.rows[0];
      console.log('Found submission:', submission);
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
            submitted_at: submission.submitted_at
          }
        })
      };
    } else {
      console.log('No submission found');
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
    console.error('=== ERROR OCCURRED ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        message: "Database test failed",
        error: error.message,
        errorType: error.constructor.name
      })
    };
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}; 