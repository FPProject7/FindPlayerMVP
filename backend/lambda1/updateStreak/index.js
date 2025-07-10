const { Client } = require('pg');

exports.handler = async (event) => {
  let userId;
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    userId = body.userId;
    if (!userId) throw new Error('Missing userId');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid request' }) };
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // Get current streak info
  const res = await client.query(
    'SELECT current_streak, last_streak_date FROM users WHERE id = $1',
    [userId]
  );
  if (res.rowCount === 0) {
    await client.end();
    return { statusCode: 404, body: JSON.stringify({ message: 'User not found' }) };
  }
  const { current_streak, last_streak_date } = res.rows[0];
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
    [newStreak, today, userId]
  );
  await client.end();

  return {
    statusCode: 200,
    body: JSON.stringify({ currentStreak: newStreak })
  };
};

