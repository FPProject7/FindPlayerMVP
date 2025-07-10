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
    const userId = event.queryStringParameters?.userId;
    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
    const onlyOwn = event.queryStringParameters?.onlyOwn === 'true';

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        body: JSON.stringify({ message: 'userId is required' })
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

    // Get posts from users that the current user follows, plus their own posts
    const feedQuery = onlyOwn
      ? `
        SELECT 
          p.id,
          p.user_id,
          p.content,
          p.image_url,
          p.video_url,
          p.created_at,
          u.name as user_name,
          u.profile_picture_url as user_profile_picture,
          COUNT(DISTINCT pl.id) as likes_count,
          COUNT(DISTINCT pc.id) as comments_count,
          EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        LEFT JOIN post_comments pc ON p.id = pc.post_id
        WHERE p.user_id = $1
        GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `
      : `
        SELECT 
          p.id,
          p.user_id,
          p.content,
          p.image_url,
          p.video_url,
          p.created_at,
          u.name as user_name,
          u.profile_picture_url as user_profile_picture,
          COUNT(DISTINCT pl.id) as likes_count,
          COUNT(DISTINCT pc.id) as comments_count,
          EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
        FROM posts p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON p.id = pl.post_id
        LEFT JOIN post_comments pc ON p.id = pc.post_id
        WHERE p.user_id = $1 OR p.user_id IN (
          SELECT following_id FROM followers WHERE follower_id = $1
        )
        GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

    const result = await client.query(feedQuery, [userId, limit, offset]);
    
    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        posts: result.rows.map(row => {
          const { user_name, user_profile_picture, ...rest } = row;
          return {
            ...rest,
            user: {
              name: user_name,
              profilePictureUrl: user_profile_picture
            }
          };
        }),
        hasMore: result.rows.length === limit
      })
    };

  } catch (error) {
    console.error('Error getting feed:', error);
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