const { Client } = require('pg');

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
  const { title, description, xp_value } = body;
  const coachId = claims?.sub; // Get coach ID from JWT claims

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
      'INSERT INTO challenges (title, description, xp_value, coach_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, xp_value, coachId]
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
