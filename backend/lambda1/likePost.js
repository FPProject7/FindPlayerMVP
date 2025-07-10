const { Client } = require('pg');

exports.handler = async (event) => {
  // Handle OPTIONS requests for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({})
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { userId, postId } = body;

    if (!userId || !postId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ message: 'userId and postId are required' })
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

    // Get post owner
    const postOwnerRes = await client.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    const postOwnerId = postOwnerRes.rows[0]?.user_id;

    // Check if user already liked the post
    const existingLike = await client.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike the post
      await client.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      // Remove like notification if it exists
      await client.query(
        `DELETE FROM notifications WHERE type = 'like_post' AND from_user_id = $1 AND to_user_id = $2`,
        [userId, postOwnerId]
      );
      
      const newLikesCount = await client.query(
        'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
        [postId]
      );

      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          message: 'Post unliked successfully',
          liked: false,
          likesCount: parseInt(newLikesCount.rows[0].count)
        })
      };
    } else {
      // Like the post
      await client.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      // Add notification if not already exists and not liking own post
      if (userId !== postOwnerId) {
        const notifCheck = await client.query(
          `SELECT 1 FROM notifications WHERE type = 'like_post' AND from_user_id = $1 AND to_user_id = $2`,
          [userId, postOwnerId]
        );
        if (notifCheck.rowCount === 0) {
          await client.query(
            `INSERT INTO notifications (type, from_user_id, to_user_id, is_read, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            ['like_post', userId, postOwnerId, false]
          );
        }
      }
      
      const newLikesCount = await client.query(
        'SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1',
        [postId]
      );

      await client.end();

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          message: 'Post liked successfully',
          liked: true,
          likesCount: parseInt(newLikesCount.rows[0].count)
        })
      };
    }

  } catch (error) {
    console.error('Error liking/unliking post:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}; 