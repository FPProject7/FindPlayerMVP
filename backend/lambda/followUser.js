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

    // Check if already following
    const followCheck = await client.query(
      `SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    if (followCheck.rowCount > 0) {
      await client.end();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Already following' })
      };
    }

    // Insert into followers
    await client.query(
      `INSERT INTO followers (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [followerId, followingId]
    );

    // Prevent duplicate notifications
    const notifCheck = await client.query(
      `SELECT 1 FROM notifications WHERE type = 'follow' AND from_user_id = $1 AND to_user_id = $2`,
      [followerId, followingId]
    );
    if (notifCheck.rowCount === 0) {
      await client.query(
        `INSERT INTO notifications (type, from_user_id, to_user_id, is_following_back)
         VALUES ($1, $2, $3, $4)`,
        ['follow', followerId, followingId, false]
      );
    }

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
