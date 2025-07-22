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

    // Extract user role from JWT claims
    const claims = event?.requestContext?.authorizer?.jwt?.claims || 
                   event?.requestContext?.authorizer?.claims || 
                   event?.requestContext?.authorizer || {};
    const userRole = claims?.["custom:role"] || "";
    let isScout = userRole.toLowerCase() === 'scout';

    console.log('getFeed - JWT claims:', claims);
    console.log('getFeed - User role from claims:', userRole);
    console.log('getFeed - Is scout:', isScout);

    // Fallback: If JWT claims are empty, check user role from database
    if (!userRole && userId) {
      try {
        const client = new Client({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        
        const userResult = await client.query(
          'SELECT role FROM users WHERE id = $1',
          [userId]
        );
        await client.end();
        
        if (userResult.rows.length > 0) {
          const dbUserRole = userResult.rows[0].role;
          isScout = dbUserRole.toLowerCase() === 'scout';
          console.log('getFeed - Fallback: User role from database:', dbUserRole);
          console.log('getFeed - Fallback: Is scout:', isScout);
        }
      } catch (error) {
        console.error('getFeed - Error getting user role from database:', error);
      }
    }

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

    // Test query to check if there are any starred players for this scout
    try {
      const testResult = await client.query(
        'SELECT COUNT(*) as count FROM starred_players WHERE scout_id = $1',
        [userId]
      );
      console.log('getFeed - Test: Scout', userId, 'has', testResult.rows[0].count, 'starred players in database');
      
      if (testResult.rows[0].count > 0) {
        const sampleResult = await client.query(
          'SELECT sp.athlete_id, u.name FROM starred_players sp JOIN users u ON sp.athlete_id = u.id WHERE sp.scout_id = $1 LIMIT 3',
          [userId]
        );
        console.log('getFeed - Test: Sample starred players:', sampleResult.rows.map(row => ({ athleteId: row.athlete_id, name: row.name })));
      }
    } catch (error) {
      console.error('getFeed - Test query error:', error);
    }

    let feedQuery;
    let queryParams;

    if (onlyOwn) {
      // For user's own posts only
      if (isScout) {
        feedQuery = `
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
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
            EXISTS(SELECT 1 FROM starred_players WHERE scout_id = $1 AND athlete_id = p.user_id) as is_starred,
            1 as priority
          FROM posts p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN post_likes pl ON p.id = pl.post_id
          LEFT JOIN post_comments pc ON p.id = pc.post_id
          WHERE p.user_id = $1
          GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `;
      } else {
        feedQuery = `
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
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
            1 as priority
          FROM posts p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN post_likes pl ON p.id = pl.post_id
          LEFT JOIN post_comments pc ON p.id = pc.post_id
          WHERE p.user_id = $1
          GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `;
      }
      queryParams = [userId, limit, offset];
    } else {
      // Enhanced feed with priority system
      if (isScout) {
        feedQuery = `
          WITH user_following AS (
            SELECT following_id FROM followers WHERE follower_id = $1
          ),
          fp_account AS (
            SELECT id FROM users WHERE email = 'admin@findplayer.com' OR name ILIKE '%findplayer%' OR name ILIKE '%find player%' LIMIT 1
          ),
          trending_posts AS (
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
              EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
              EXISTS(SELECT 1 FROM starred_players WHERE scout_id = $1 AND athlete_id = p.user_id) as is_starred,
              (COUNT(DISTINCT pl.id) + COUNT(DISTINCT pc.id) * 2) as engagement_score
            FROM posts p
            INNER JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id
            LEFT JOIN post_comments pc ON p.id = pc.post_id
            WHERE p.user_id != $1 
              AND p.user_id NOT IN (SELECT following_id FROM user_following)
              AND p.user_id NOT IN (SELECT id FROM fp_account)
              AND p.created_at > NOW() - INTERVAL '7 days'
            GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
            ORDER BY engagement_score DESC, p.created_at DESC
            LIMIT 10
          )
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
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
            EXISTS(SELECT 1 FROM starred_players WHERE scout_id = $1 AND athlete_id = p.user_id) as is_starred,
            CASE 
              WHEN p.user_id IN (SELECT id FROM fp_account) THEN 1
              WHEN p.user_id IN (SELECT following_id FROM user_following) THEN 2
              WHEN p.id IN (SELECT id FROM trending_posts) THEN 3
              ELSE 4
            END as priority
          FROM posts p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN post_likes pl ON p.id = pl.post_id
          LEFT JOIN post_comments pc ON p.id = pc.post_id
          WHERE p.user_id = $1 
             OR p.user_id IN (SELECT following_id FROM user_following)
             OR p.user_id IN (SELECT id FROM fp_account)
             OR p.id IN (SELECT id FROM trending_posts)
          GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
          ORDER BY priority ASC, p.created_at DESC
          LIMIT $2 OFFSET $3
        `;
      } else {
        feedQuery = `
          WITH user_following AS (
            SELECT following_id FROM followers WHERE follower_id = $1
          ),
          fp_account AS (
            SELECT id FROM users WHERE email = 'admin@findplayer.com' OR name ILIKE '%findplayer%' OR name ILIKE '%find player%' LIMIT 1
          ),
          trending_posts AS (
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
              EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
              (COUNT(DISTINCT pl.id) + COUNT(DISTINCT pc.id) * 2) as engagement_score
            FROM posts p
            INNER JOIN users u ON p.user_id = u.id
            LEFT JOIN post_likes pl ON p.id = pl.post_id
            LEFT JOIN post_comments pc ON p.id = pc.post_id
            WHERE p.user_id != $1 
              AND p.user_id NOT IN (SELECT following_id FROM user_following)
              AND p.user_id NOT IN (SELECT id FROM fp_account)
              AND p.created_at > NOW() - INTERVAL '7 days'
            GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
            ORDER BY engagement_score DESC, p.created_at DESC
            LIMIT 10
          )
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
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked,
            CASE 
              WHEN p.user_id IN (SELECT id FROM fp_account) THEN 1
              WHEN p.user_id IN (SELECT following_id FROM user_following) THEN 2
              WHEN p.id IN (SELECT id FROM trending_posts) THEN 3
              ELSE 4
            END as priority
          FROM posts p
          INNER JOIN users u ON p.user_id = u.id
          LEFT JOIN post_likes pl ON p.id = pl.post_id
          LEFT JOIN post_comments pc ON p.id = pc.post_id
          WHERE p.user_id = $1 
             OR p.user_id IN (SELECT following_id FROM user_following)
             OR p.user_id IN (SELECT id FROM fp_account)
             OR p.id IN (SELECT id FROM trending_posts)
          GROUP BY p.id, p.user_id, p.content, p.image_url, p.video_url, p.created_at, u.name, u.profile_picture_url, u.role
          ORDER BY priority ASC, p.created_at DESC
          LIMIT $2 OFFSET $3
        `;
      }
      queryParams = [userId, limit, offset];
    }

    const result = await client.query(feedQuery, queryParams);
    
    await client.end();

    // Debug logging for starred posts
    if (isScout) {
      const starredPosts = result.rows.filter(row => row.is_starred);
      console.log('getFeed - Backend: Scout has', starredPosts.length, 'starred posts out of', result.rows.length, 'total posts');
      starredPosts.forEach(row => {
        console.log('getFeed - Backend: Starred post by', row.user_name, '(ID:', row.user_id, ') - is_starred:', row.is_starred);
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: JSON.stringify({
        posts: result.rows.map(row => {
          const { user_name, user_profile_picture, user_role, is_starred, ...rest } = row;
          const postData = {
            ...rest,
            user: {
              name: user_name,
              profilePictureUrl: user_profile_picture,
              role: user_role
            }
          };
          
          if (isScout) {
            postData.isStarred = is_starred || false;
          }
          
          return postData;
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