const { Client } = require('pg');

// Helper to build responses with CORS headers
const buildResponse = (statusCode, bodyObj) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173', // Adjust for production
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
  },
  body: JSON.stringify(bodyObj)
});

exports.handler = async (event) => {
  // --- 0. Handle CORS preflight ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: ''
    };
  }

  // --- 1. Auth check ---
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  console.log('JWT Claims:', JSON.stringify(claims));
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";
  console.log('customRole:', customRole);
  const coachId = claims?.sub;

  if (!(groups.includes("coaches") || customRole === "coach")) {
    return buildResponse(403, { message: "Forbidden: Only coaches can review submissions" });
  }

  // --- 2. Parse path param and body ---
  const submissionId = event.pathParameters?.id;
  if (!submissionId) {
    return buildResponse(400, { message: "Missing submission id in path" });
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return buildResponse(400, { message: "Invalid JSON body" });
  }

  const { action, comment } = body;
  if (!["approve", "deny"].includes(action)) {
    return buildResponse(400, { message: "Action must be 'approve' or 'deny'" });
  }

  if (action === "deny" && (!comment || comment.trim() === "")) {
    return buildResponse(400, { message: "Comment is required for denial" });
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
      return buildResponse(404, { message: "Submission not found or not owned by coach" });
    }

    const submission = submissionRes.rows[0];

    // --- 4. Update submission ---
    let newStatus = action === "approve" ? "approved" : "denied";
    let reviewComment = action === "approve" ? (comment || null) : comment;

    const updateRes = await client.query(
      `UPDATE challenge_submissions
       SET status = $1, reviewed_at = NOW(), reviewed_by = $2, review_comment = $3
       WHERE id = $4
       RETURNING *`,
      [newStatus, coachId, reviewComment, submissionId]
    );

    const updatedSubmission = updateRes.rows[0];

    // --- 5. Award XP via remote Lambda, but only if not already awarded ---
    const xpLambdaUrl = 'https://rnf66y24gb.execute-api.us-east-1.amazonaws.com/default/xp/award';
    const xpCalls = [];
    // Check if coach has already received XP for this review
    const coachXPRes = await client.query(
      `SELECT 1 FROM user_experience_points WHERE user_id = $1 AND challenge_id = $2 AND submission_id = $3 AND earned_for = 'challenge_review'`,
      [coachId, submission.challenge_id, submissionId]
    );
    if (coachXPRes.rows.length === 0) {
      xpCalls.push(
        fetch(xpLambdaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: coachId,
            challengeId: submission.challenge_id,
            submissionId: submissionId,
            points: 2,
            earnedFor: 'challenge_review'
          })
        }).then(res => res.json()).catch(e => { console.error('Coach XP error:', e); return null; })
      );
    }
    // If approved, check if athlete has already received XP for this approval
    if (action === "approve") {
      const athleteXPRes = await client.query(
        `SELECT 1 FROM user_experience_points WHERE user_id = $1 AND challenge_id = $2 AND submission_id = $3 AND earned_for = 'challenge_submission'`,
        [submission.athlete_id, submission.challenge_id, submissionId]
      );
      if (athleteXPRes.rows.length === 0) {
        xpCalls.push(
          fetch(xpLambdaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: submission.athlete_id,
              challengeId: submission.challenge_id,
              submissionId: submissionId,
              points: submission.xp_value,
              earnedFor: 'challenge_submission'
            })
          }).then(res => res.json()).catch(e => { console.error('Athlete XP error:', e); return null; })
        );
      }
    }
    // Wait for all XP calls to finish (but don't block main logic on error)
    await Promise.all(xpCalls);

    await client.end();
    return buildResponse(200, updatedSubmission);

  } catch (err) {
    console.error('Error reviewing submission:', err);
    await client.end();
    return buildResponse(500, { message: 'Error reviewing submission', error: err.message });
  }
}; 