const { Client } = require('pg');

// Recommended XP milestones for leveling (example: Level 1 at 0 XP, Level 2 at 10 XP, etc.)
const LEVEL_MILESTONES = [0, 10, 25, 50, 100, 200, 400, 700, 1100, 1600, 2200, 3000, 4000, 5200, 6600, 8200, 10000];

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