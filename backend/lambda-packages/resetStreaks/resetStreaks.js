const { Client } = require('pg');

exports.handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Reset streaks for users who missed a day
  const res = await client.query(
    `UPDATE users
     SET current_streak = 0
     WHERE last_streak_date IS NOT NULL
       AND last_streak_date <> $1
       AND last_streak_date <> $2
       AND current_streak <> 0
     RETURNING id, name, last_streak_date, current_streak`,
    [today, yesterday]
  );

  await client.end();
  console.log(`Streaks reset for ${res.rowCount} users.`);
  return {
    statusCode: 200,
    body: JSON.stringify({ resetUsers: res.rows, count: res.rowCount })
  };
}; 