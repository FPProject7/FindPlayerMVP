const { Client } = require('pg');

exports.handler = async (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  console.log('JWT Claims:', JSON.stringify(claims));
  
  // Get coachId from query parameters or JWT claims
  const queryParams = event.queryStringParameters || {};
  const requestedCoachId = queryParams.coachId;
  const authenticatedCoachId = claims?.sub;
  
  // Determine which coach's challenges to fetch
  let targetCoachId;
  
  if (requestedCoachId) {
    // If coachId is provided in query params, use that (public access)
    targetCoachId = requestedCoachId;
  } else {
    // If no coachId provided, user must be authenticated coach viewing their own challenges
    const groups = claims?.["cognito:groups"] || [];
    const customRole = claims?.["custom:role"] || claims?.role || "";
    
    if (!(groups.includes("coaches") || customRole === "coach")) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({ message: "Forbidden: Only coaches can fetch their own challenges without specifying coachId" })
      };
    }
    targetCoachId = authenticatedCoachId;
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
    const query = `
      SELECT 
        c.id, c.title, c.description, c.xp_value, c.created_at, c.coach_id,
        u.name AS coach_name,
        u.profile_picture_url AS coach_profile_picture_url,
        COUNT(s.id) AS submission_count
      FROM challenges c
      LEFT JOIN users u ON c.coach_id = u.id::varchar
      LEFT JOIN challenge_submissions s ON s.challenge_id = c.id
      WHERE c.coach_id = $1::text
      GROUP BY c.id, u.name, u.profile_picture_url
      ORDER BY c.created_at DESC
    `;
    const result = await client.query(query, [targetCoachId]);
    await client.end();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: JSON.stringify(result.rows)
    };
  } catch (err) {
    await client.end();
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: JSON.stringify({ message: 'Error fetching coach challenges', error: err.message })
    };
  }
}; 