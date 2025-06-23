const { Client } = require('pg');

exports.handler = async (event) => {
  // --- 1. Auth check ---
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  console.log('JWT Claims:', JSON.stringify(claims));
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";
  console.log('customRole:', customRole);
  const coachId = claims?.sub;

  if (!(groups.includes("coaches") || customRole === "coach")) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Only coaches can review submissions" })
    };
  }

  // --- 2. Parse path param and body ---
  const submissionId = event.pathParameters?.id;
  if (!submissionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing submission id in path" })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON body" })
    };
  }

  const { action, comment } = body;
  if (!["approve", "deny"].includes(action)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Action must be 'approve' or 'deny'" })
    };
  }
  // Only require comment for denial
  if (action === "deny" && (!comment || comment.trim() === "")) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Comment is required for denial" })
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

    // --- 3. Validate submission and coach ownership ---
    const submissionRes = await client.query(
      `SELECT s.*, c.xp_value, c.coach_id, c.title, s.athlete_id
       FROM challenge_submissions s
       JOIN challenges c ON s.challenge_id = c.id
       WHERE s.id = $1 AND c.coach_id = $2::text`,
      [submissionId, coachId]
    );
    if (submissionRes.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Submission not found or not owned by coach" })
      };
    }
    const submission = submissionRes.rows[0];

    // --- 4. Update submission ---
    let newStatus, reviewComment;
    if (action === "approve") {
      newStatus = "approved";
      reviewComment = comment || null;
    } else {
      newStatus = "denied";
      reviewComment = comment;
    }
    const updateRes = await client.query(
      `UPDATE challenge_submissions
       SET status = $1, reviewed_at = NOW(), reviewed_by = $2, review_comment = $3
       WHERE id = $4
       RETURNING *`,
      [newStatus, coachId, reviewComment, submissionId]
    );
    const updatedSubmission = updateRes.rows[0];

    // --- 5. Award XP if approved ---
    if (action === "approve") {
      await client.query(
        `INSERT INTO user_experience_points (user_id, challenge_id, submission_id, points_earned, earned_at, earned_for)
         VALUES ($1, $2, $3, $4, NOW(), 'challenge_submission')`,
        [submission.athlete_id, submission.challenge_id, submissionId, submission.xp_value]
      );
    }

    await client.end();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSubmission)
    };
  } catch (err) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error reviewing submission', error: err.message })
    };
  }
}; 