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
  const { video_url } = body;

  const athleteId = claims?.sub;
  const athleteName = claims?.given_name || claims?.name || "Unknown";   // ✅ Extract athlete's name

  if (!athleteId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "User ID not found in token" })
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

    const existingSubmission = await client.query(
      `SELECT * FROM challenge_submissions 
       WHERE challenge_id = $1 AND athlete_id = $2`,
      [challengeId, athleteId]
    );

    if (existingSubmission.rows.length > 0) {
      await client.end();
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          message: 'You have already submitted a video for this challenge',
          submission: existingSubmission.rows[0]
        })
      };
    }

    // ✅ Insert athlete_name as well
    const result = await client.query(
      `INSERT INTO challenge_submissions (challenge_id, athlete_id, athlete_name, video_url, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [challengeId, athleteId, athleteName, video_url]
    );
    const submission = result.rows[0];

    // Fetch coach ID for the challenge
    const coachRes = await client.query(
      `SELECT coach_id FROM challenges WHERE id = $1`,
      [challengeId]
    );
    const coachId = coachRes.rows[0]?.coach_id;
    if (coachId) {
      // Insert notification for coach
      await client.query(
        `INSERT INTO notifications (type, from_user_id, to_user_id, challenge_id, submission_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['challenge_submission', athleteId, coachId, challengeId, submission.id]
      );
    }

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Submission received successfully',
        submission: submission
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