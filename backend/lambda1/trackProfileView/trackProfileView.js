const { Client } = require('pg');

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    // Get user ID from JWT claims
    const viewerId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!viewerId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'Unauthorized: No user ID found in token.' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { viewedUserId } = body;

    if (!viewedUserId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'viewedUserId is required' }),
      };
    }

    // Don't track viewing own profile
    if (viewerId === viewedUserId) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'Profile view tracked (own profile)' }),
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

    // Get viewer and viewed user roles
    const viewerResult = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [viewerId]
    );

    const viewedUserResult = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [viewedUserId]
    );

    if (viewerResult.rowCount === 0 || viewedUserResult.rowCount === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    const viewerRole = viewerResult.rows[0].role;
    const viewedUserRole = viewedUserResult.rows[0].role;

    // Check if this is a scout viewing an athlete or coach's profile
    if (viewerRole === 'scout' && (viewedUserRole === 'athlete' || viewedUserRole === 'coach')) {
      // Check if we already have a recent notification for this scout-user pair
      const existingNotification = await client.query(
        `SELECT id FROM notifications 
         WHERE type = 'profile_view' 
         AND from_user_id = $1 
         AND to_user_id = $2 
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [viewerId, viewedUserId]
      );

      if (existingNotification.rowCount === 0) {
        // Create notification for athlete or coach
        await client.query(
          `INSERT INTO notifications (type, from_user_id, to_user_id, is_read, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          ['profile_view', viewerId, viewedUserId, false]
        );
      }
    }

    // Update scout's viewed counts (if viewer is a scout)
    if (viewerRole === 'scout') {
      if (viewedUserRole === 'athlete') {
        // await client.query(
        //   `UPDATE users 
        //    SET athletes_viewed = COALESCE(athletes_viewed, 0) + 1 
        //    WHERE id = $1`,
        //   [viewerId]
        // );
      } else if (viewedUserRole === 'coach') {
        // await client.query(
        //   `UPDATE users 
        //    SET coaches_viewed = COALESCE(coaches_viewed, 0) + 1 
        //    WHERE id = $1`,
        //   [viewerId]
        // );
      }
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ message: 'Profile view tracked successfully' }),
    };
  } catch (err) {
    console.error('Error in trackProfileView:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}; 