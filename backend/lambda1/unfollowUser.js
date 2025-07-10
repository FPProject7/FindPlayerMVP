const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { followerId, followingId } = body;

    if (!followerId || !followingId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'followerId and followingId are required' }) };
    }

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const result = await client.query(
      `DELETE FROM followers WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    await client.end();

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No follow relationship found to delete' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Unfollowed successfully' })
    };

  } catch (err) {
    console.error('Error in unfollowUser:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
