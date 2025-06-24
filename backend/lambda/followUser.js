const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { followerId, followingId } = body;

    if (!followerId || !followingId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'followerId and followingId are required' }) };
    }

    if (followerId === followingId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'You cannot follow yourself' }) };
    }

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Insert if not exists
    const query = `
      INSERT INTO followers (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await client.query(query, [followerId, followingId]);

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Follow action completed (or already followed)' })
    };

  } catch (err) {
    console.error('Error in followUser:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
