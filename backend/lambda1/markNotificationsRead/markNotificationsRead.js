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
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
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
    const { notificationIds } = body; // Optional: specific notification IDs to mark as read

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    let result;
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      const placeholders = notificationIds.map((_, index) => `$${index + 2}`).join(',');
      result = await client.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW() 
         WHERE id = ANY($1) AND to_user_id = $2`,
        [notificationIds, userId]
      );
    } else {
      // Mark all notifications for the user as read
      result = await client.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW() 
         WHERE to_user_id = $1 AND is_read = false`,
        [userId]
      );
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Notifications marked as read successfully',
        updatedCount: result.rowCount
      }),
    };
  } catch (err) {
    console.error('Error in markNotificationsRead:', err);
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