const { Client } = require('pg');

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    // Get user ID from JWT claims (API Gateway authorizer must be set up)
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({ message: 'Unauthorized: No user ID found in token.' }),
      };
    }

    // Connect to your database
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Query notifications for the user
    const result = await client.query(
      `SELECT n.id, n.type, n.is_following_back, 
              n.challenge_id, n.submission_id, n.review_result, n.created_at, n.is_read,
              c.title as challenge_title,
              u.id as from_user_id, u.name as from_user_name, u.profile_picture_url as from_user_profile_picture_url, u.role as from_user_role,
              s.video_url as submission_video_url
         FROM notifications n
         LEFT JOIN challenges c ON n.challenge_id = c.id
         LEFT JOIN challenge_submissions s ON n.submission_id = s.id
         JOIN users u ON n.from_user_id = u.id
        WHERE n.to_user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 50`,
      [userId]
    );

    await client.end();

    // Format notifications for frontend
    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      fromUser: {
        id: row.from_user_id,
        name: row.from_user_name,
        profilePictureUrl: row.from_user_profile_picture_url || '',
        role: row.from_user_role,
      },
      isFollowingBack: row.is_following_back,
      challengeId: row.challenge_id,
      submissionId: row.submission_id,
      reviewResult: row.review_result,
      createdAt: row.created_at,
      isRead: row.is_read,
      challengeTitle: row.challenge_title,
      submissionVideoUrl: row.submission_video_url,
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(notifications),
    };
  } catch (err) {
    console.error('Error in getNotifications:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};