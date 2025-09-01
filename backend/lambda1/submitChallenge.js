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

    // Check if user exists (removed quota check)
    const userResult = await client.query(
      'SELECT is_premium_member FROM users WHERE id = $1',
      [athleteId]
    );
    
    if (userResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Athlete not found' })
      };
    }

    // Removed quota checking logic - allow unlimited submissions

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
        `INSERT INTO notifications (type, from_user_id, to_user_id, challenge_id, submission_id, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        ['challenge_submission', athleteId, coachId, challengeId, submission.id, false]
      );
      // Send push to coach (same pattern as likes/comments/follows/messages)
      try {
        const tokenRes = await client.query('SELECT push_token, push_platform FROM users WHERE id = $1', [coachId]);
        const pushToken = tokenRes.rows[0]?.push_token;
        if (pushToken) {
          const AWS = require('aws-sdk');
          const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
          const message = {
            default: 'New challenge submission',
            APNS: JSON.stringify({ aps: { alert: { title: 'Challenge Submission', body: 'You received a new submission' }, sound: 'default', badge: 1 } }),
            GCM: JSON.stringify({ notification: { title: 'Challenge Submission', body: 'You received a new submission' } }),
          };
          await sns.publish({ Message: JSON.stringify(message), MessageStructure: 'json', TargetArn: pushToken }).promise();
        }
      } catch (e) {
        console.warn('Failed to send challenge submission push', e.message);
      }
    }

    // === Streak update logic (inlined from updateStreak) ===
    // Get current streak info
    const streakRes = await client.query(
      'SELECT current_streak, last_streak_date FROM users WHERE id = $1',
      [athleteId]
    );
    if (streakRes.rowCount > 0) {
      const { current_streak, last_streak_date } = streakRes.rows[0];
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let newStreak = 1;
      if (last_streak_date === today) {
        newStreak = current_streak;
      } else if (last_streak_date === yesterday) {
        newStreak = current_streak + 1;
      }
      await client.query(
        'UPDATE users SET current_streak = $1, last_streak_date = $2 WHERE id = $3',
        [newStreak, today, athleteId]
      );
    }
    // === End streak update logic ===

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