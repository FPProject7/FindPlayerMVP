const { Client } = require('pg');

exports.handler = async (event) => {
  const scoutId = event.queryStringParameters?.scoutId || (event.body && JSON.parse(event.body).scoutId);
  if (!scoutId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing scoutId' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // Count unique athletes viewed
  const athleteRes = await client.query(
    `SELECT COUNT(DISTINCT u.id) AS count
     FROM notifications n
     JOIN users u ON u.id = n.to_user_id
     WHERE n.type = 'profile_view'
       AND n.from_user_id = $1
       AND u.role = 'athlete'`,
    [scoutId]
  );
  // Count unique coaches viewed
  const coachRes = await client.query(
    `SELECT COUNT(DISTINCT u.id) AS count
     FROM notifications n
     JOIN users u ON u.id = n.to_user_id
     WHERE n.type = 'profile_view'
       AND n.from_user_id = $1
       AND u.role = 'coach'`,
    [scoutId]
  );

  await client.end();

  return {
    statusCode: 200,
    body: JSON.stringify({
      athleteCount: parseInt(athleteRes.rows[0].count, 10),
      coachCount: parseInt(coachRes.rows[0].count, 10)
    }),
    headers: { 'Access-Control-Allow-Origin': '*' }
  };
};