const { Client } = require('pg');

// Recommended XP milestones for leveling (example: Level 1 at 0 XP, Level 2 at 10 XP, etc.)
const LEVEL_MILESTONES = [
  0,    // Level 0
  50,   // Level 1
  200,  // Level 2
  500,  // Level 3
  1000, // Level 4
  1750, // Level 5
  2850, // Level 6
  4350, // Level 7
  6350, // Level 8
  8950, // Level 9
  12250, // Level 10
  16350, // Level 11
  21350, // Level 12
  27350, // Level 13
  34550, // Level 14
  43050, // Level 15
  53050, // Level 16
  64550, // Level 17
  77550, // Level 18
  92550, // Level 19
  109550 // Level 20 (Max/Prestige)
];

function getLevelFromXP(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_MILESTONES.length; i++) {
    if (xp >= LEVEL_MILESTONES[i]) level = i + 1;
    else break;
  }
  return level;
}

/**
 * Awards experience points to a user for a challenge or submission.
 * Prevents double-awarding for the same event.
 * Updates the user's total XP and returns new XP and level.
 *
 * @param {Object} params
 * @param {string} params.userId - The user's UUID
 * @param {number} params.challengeId - The challenge's ID
 * @param {number|null} params.submissionId - The submission's ID (nullable)
 * @param {number} params.points - XP points to award
 * @param {string} params.earnedFor - 'challenge_post' or 'challenge_submission'
 * @param {Client} params.client - Connected pg Client
 * @returns {Promise<{xpTotal: number, level: number, awarded: boolean, alreadyAwarded?: boolean}>}
 */
exports.awardExperiencePoints = async ({
  userId,
  challengeId,
  submissionId = null,
  points,
  earnedFor,
  client
}) => {
  // Prevent double-awarding for the same event
  const existsRes = await client.query(
    `SELECT 1 FROM user_experience_points WHERE user_id = $1 AND challenge_id = $2 AND (submission_id = $3 OR $3 IS NULL) AND earned_for = $4`,
    [userId, challengeId, submissionId, earnedFor]
  );
  if (existsRes.rows.length > 0) {
    // Already awarded for this event
    const userRes = await client.query(`SELECT xp_total FROM users WHERE id = $1`, [userId]);
    const xpTotal = userRes.rows[0]?.xp_total || 0;
    const level = getLevelFromXP(xpTotal);
    return { xpTotal, level, awarded: false, alreadyAwarded: true };
  }

  // Insert XP record
  await client.query(
    `INSERT INTO user_experience_points (user_id, challenge_id, submission_id, points_earned, earned_at, earned_for)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [userId, challengeId, submissionId, points, earnedFor]
  );

  // Update user's total XP
  await client.query(
    `UPDATE users SET xp_total = xp_total + $1 WHERE id = $2`,
    [points, userId]
  );

  // Fetch new XP and level
  const userRes = await client.query(`SELECT xp_total FROM users WHERE id = $1`, [userId]);
  const xpTotal = userRes.rows[0]?.xp_total || 0;
  const level = getLevelFromXP(xpTotal);

  return { xpTotal, level, awarded: true };
};

exports.LEVEL_MILESTONES = LEVEL_MILESTONES;
exports.getLevelFromXP = getLevelFromXP;

// Lambda handler for direct invocation
exports.handler = async (event) => {
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON body" })
    };
  }

  const { userId, challengeId, submissionId, points, earnedFor } = body;

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await exports.awardExperiencePoints({
      userId,
      challengeId,
      submissionId,
      points,
      earnedFor,
      client
    });
    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (err) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error awarding XP', error: err.message })
    };
  }
}; 