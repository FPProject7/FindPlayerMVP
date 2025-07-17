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
    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
    const userId = event.queryStringParameters?.userId; // Optional: to check if user liked the posts

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Get trending posts based on engagement (likes + comments) from the last 7 days
    const trendingQuery = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image_url,
        p.video_url,
        p.created_at,
        u.name as user_name,
        u.profile_picture_url as user_profile_picture,
        u.role as user_role,
        COUNT(DISTINCT pl.id) as likes_count,
        COUNT(DISTINCT pc.id) as comments_count,
        ${userId ? 'EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $3) as is_liked' : 'false as is_liked'},
        (COUNT(DISTINCT pl.id) + COUNT(DISTINCT pc.id) * 2) as engagement_score
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      LEFT JOIN post_comments pc ON p.id = pc.post_id
      WHERE p.created_at > NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
      HAVING (COUNT(DISTINCT pl.id) + COUNT(DISTINCT pc.id) * 2) > 0
      ORDER BY engagement_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const queryParams = userId ? [limit, offset, userId] : [limit, offset];
    const result = await client.query(trendingQuery, queryParams);
    
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
          const { user_name, user_profile_picture, user_role, engagement_score, ...rest } = row;
          return {
            ...rest,
            user: {
              name: user_name,
              profilePictureUrl: user_profile_picture,
              role: user_role
            },
            engagementScore: engagement_score
          };
        }),
        hasMore: result.rows.length === limit
      })
    };

  } catch (error) {
    console.error('Error getting trending posts:', error);
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