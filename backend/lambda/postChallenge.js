const { Client } = require('pg');

exports.handler = async (event) => {
  // Extract claims
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
const groups = claims?.["cognito:groups"] || [];
const customRole = claims?.["custom:role"] || "";

if (!groups.includes("coaches") && customRole !== "coach") {
  return {
    statusCode: 403,
    body: JSON.stringify({ message: "Forbidden: Only coaches can create challenges" }),
  };
}

  const body = JSON.parse(event.body);
  const { title, description, xp_value } = body;

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
      'INSERT INTO challenges (title, description, xp_value) VALUES ($1, $2, $3) RETURNING *',
      [title, description, xp_value]
    );

    await client.end();

    return {
      statusCode: 200,
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
      body: JSON.stringify({ message: 'Error creating challenge', error: err.message }),
    };
  }
};
