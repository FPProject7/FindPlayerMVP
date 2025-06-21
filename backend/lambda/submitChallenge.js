const { Client } = require('pg');

exports.handler = async (event) => {
 const claims = event?.requestContext?.authorizer?.jwt?.claims;
const groups = claims?.["cognito:groups"] || [];
const customRole = claims?.["custom:role"] || "";

if (!groups.includes("athletes") && customRole !== "athlete") {
  return {
    statusCode: 403,
    body: JSON.stringify({ message: "Forbidden: Only athletes can submit challenges" })
  };
}

  const challengeId = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const { athlete_id, video_url } = body;

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
      `INSERT INTO challenge_submissions (challenge_id, athlete_id, video_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [challengeId, athlete_id, video_url]
    );

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Submission received successfully',
        submission: result.rows[0]
      }),
    };
  } catch (err) {
    console.error('DB error:', err);
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting challenge', error: err.message }),
    };
  }
};
