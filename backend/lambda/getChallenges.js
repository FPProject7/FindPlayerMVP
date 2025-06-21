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
    const res = await client.query('SELECT * FROM challenges ORDER BY created_at DESC');
    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (err) {
    console.error('DB error:', err);
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching challenges', error: err.message }),
    };
  }
};
