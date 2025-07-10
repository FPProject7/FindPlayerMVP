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
    const { userId, postId, content } = body;

    if (!userId || !postId || !content) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ message: 'userId, postId, and content are required' })
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
    if (postOwnerRes.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ message: 'Post not found' })
      };
    }
    const postOwnerId = postOwnerRes.rows[0].user_id;

    // Insert the comment
    const commentResult = await client.query(
      'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );

    // Add notification if not commenting on own post
    if (userId !== postOwnerId) {
      await client.query(
        `INSERT INTO notifications (type, from_user_id, to_user_id, post_id, comment_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['comment_post', userId, postOwnerId, postId, commentResult.rows[0].id]
      );
    }

    // Get updated comment count
    const commentCountRes = await client.query(
      'SELECT COUNT(*) as count FROM post_comments WHERE post_id = $1',
      [postId]
    );

    await client.end();

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Comment added successfully',
        comment: commentResult.rows[0],
        commentsCount: parseInt(commentCountRes.rows[0].count)
      })
    };

  } catch (error) {
    console.error('Error adding comment:', error);
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