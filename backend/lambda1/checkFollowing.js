const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    let followerId, followingId;

    // Check if coming from query parameters or body (depends on API setup)
    if (event.queryStringParameters) {
      followerId = event.queryStringParameters.followerId;
      followingId = event.queryStringParameters.followingId;
    } else {
      const body = JSON.parse(event.body);
      followerId = body.followerId;
      followingId = body.followingId;
    }

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
      `SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        isFollowing: result.rowCount > 0
      })
    };

  } catch (err) {
    console.error('Error in checkFollowing:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
