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
    const { postId, limit = 50, offset = 0 } = event.queryStringParameters || {};

    if (!postId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({ message: 'postId is required' })
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

    // Get comments with user information
    const commentsQuery = `
      SELECT 
        pc.id,
        pc.post_id,
        pc.user_id,
        pc.content,
        pc.created_at,
        u.name as user_name,
        u.profile_picture_url as user_profile_picture
      FROM post_comments pc
      INNER JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = $1
      ORDER BY pc.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await client.query(commentsQuery, [postId, limit, offset]);
    
    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        comments: result.rows.map(row => ({
          id: row.id,
          postId: row.post_id,
          userId: row.user_id,
          content: row.content,
          createdAt: row.created_at,
          user: {
            name: row.user_name,
            profilePictureUrl: row.user_profile_picture
          }
        })),
        hasMore: result.rows.length === limit
      })
    };

  } catch (error) {
    console.error('Error getting comments:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}; 