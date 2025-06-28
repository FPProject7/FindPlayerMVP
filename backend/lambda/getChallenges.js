const { Client } = require('pg');

exports.handler = async (event) => {
  // Safely access authorizer claims
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";

  // Accept athleteId as a query parameter
  const athleteId = event.queryStringParameters?.athleteId;

  if (!groups.includes("athletes") && customRole !== "athlete" && !athleteId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Only athletes can fetch challenges or athleteId must be provided" })
    };
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
    let result;
    if (athleteId) {
      // Fetch all challenges the athlete has submitted to
      const query = `
        SELECT DISTINCT c.*, s.status AS submission_status, s.id AS submission_id, s.submitted_at
        FROM challenges c
        JOIN challenge_submissions s ON s.challenge_id = c.id
        WHERE s.athlete_id = $1
        ORDER BY s.submitted_at DESC
      `;
      result = await client.query(query, [athleteId]);
    } else {
      // Original: fetch all available challenges
    const query = `
      SELECT 
        c.id, c.title, c.description, c.xp_value, c.created_at, c.coach_id,
        u.name AS coach_name,
        u.profile_picture_url AS coach_profile_picture_url
      FROM challenges c
      LEFT JOIN users u ON c.coach_id = u.id::varchar
      ORDER BY c.created_at DESC
    `;
      result = await client.query(query);
    }
    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
      headers: { 'Content-Type': 'application/json' },
    };
    
  } catch (err) {
    await client.end();
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: JSON.stringify({ message: 'Error fetching challenges', error: err.message })
    };
  }
};
