const { Client } = require('pg');

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  try {
    const userId = event.queryStringParameters?.userId;
    const type = event.queryStringParameters?.type; // 'followers' or 'following'
    const countsOnly = event.queryStringParameters?.countsOnly === 'true';
    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
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

    if (countsOnly) {
      const countsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM followers WHERE following_id = $1) AS follower_count,
          (SELECT COUNT(*) FROM followers WHERE follower_id = $1) AS following_count;
      `;
      const result = await client.query(countsQuery, [userId]);
      await client.end();
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
          followerCount: result.rows[0].follower_count,
          followingCount: result.rows[0].following_count
        })
      };
    }

    if (type === 'followers') {
      const query = `
        SELECT u.id, u.name, u.profile_picture_url
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = $1
        LIMIT $2 OFFSET $3;
      `;
      const result = await client.query(query, [userId, limit, offset]);
      await client.end();
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
          items: result.rows
        })
      };
    }

    if (type === 'following') {
      const query = `
        SELECT u.id, u.name, u.profile_picture_url
        FROM followers f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = $1
        LIMIT $2 OFFSET $3;
      `;
      const result = await client.query(query, [userId, limit, offset]);
      await client.end();
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
          items: result.rows
        })
      };
    }

    await client.end();
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: 'Invalid request: type must be "followers", "following", or countsOnly=true' })
    };

  } catch (err) {
    console.error('Error in getConnections:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
