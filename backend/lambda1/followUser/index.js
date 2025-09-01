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
        `INSERT INTO notifications (type, from_user_id, to_user_id, is_following_back, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['follow', followerId, followingId, false, false]
      );
    }

    // Attempt to send push to followed user
    try {
      const tokenRes = await client.query('SELECT push_token, push_platform FROM users WHERE id = $1', [followingId]);
      const pushToken = tokenRes.rows[0]?.push_token;
      if (pushToken) {
        const AWS = require('aws-sdk');
        const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
        const message = {
          default: 'You have a new follower',
          APNS: JSON.stringify({ aps: { alert: { title: 'New Follower', body: 'Someone started following you' }, sound: 'default', badge: 1 } }),
          GCM: JSON.stringify({ notification: { title: 'New Follower', body: 'Someone started following you' } }),
        };
        await sns.publish({ Message: JSON.stringify(message), MessageStructure: 'json', TargetArn: pushToken }).promise();
      }
    } catch (e) {
      console.warn('Failed to send follow push', e.message);
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
