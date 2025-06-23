const { Client } = require('pg');

exports.handler = async (event) => {
  // Safely access authorizer claims
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";

  if (!groups.includes("athletes") && customRole !== "athlete") {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Only athletes can fetch challenges" })
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

    // Fetch challenges and join with users for coach info
    const query = `
      SELECT 
        c.id, c.title, c.description, c.xp_value, c.created_at, c.coach_id,
        u.name AS coach_name,
        u.profile_picture_url AS coach_avatar
      FROM challenges c
      LEFT JOIN users u ON c.coach_id = u.id::varchar
      ORDER BY c.created_at DESC
    `;
    const result = await client.query(query);
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
