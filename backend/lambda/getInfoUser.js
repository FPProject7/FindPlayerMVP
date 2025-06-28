const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const requestedUserId = queryParams.userId;
    const requestedUsername = queryParams.username;

    const currentUserId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const userIdToFetch = requestedUserId || currentUserId;

    if (!userIdToFetch && !requestedUsername) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: 'No user ID or username provided or found in token.' }),
      };
    }

    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    let result;

    if (requestedUsername) {
      const normalizedUsername = requestedUsername
        .trim()
        .toLowerCase()
        .replace(/[-\s_]+/g, ' ');

      const query = `
        SELECT 
          id, name, email, profile_picture_url AS "profilePictureUrl", role, xp_total AS "xpTotal", height, country, sport, position,
          (SELECT COUNT(*) FROM followers WHERE following_id = users.id) AS "followersCount",
          (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS "followingCount",
          (SELECT COUNT(*) FROM user_completed_challenges WHERE user_id = users.id) AS "challengesCompleted"
        FROM users 
        WHERE LOWER(TRIM(name)) = LOWER($1)
        OR LOWER(REPLACE(TRIM(name), ' ', '')) = LOWER(REPLACE($1, ' ', ''))
        OR LOWER(REPLACE(TRIM(name), ' ', '-')) = LOWER(REPLACE($1, ' ', '-'))
        OR LOWER(REPLACE(TRIM(name), ' ', '_')) = LOWER(REPLACE($1, ' ', '_'))
        OR LOWER(REPLACE(REPLACE(REPLACE(TRIM(name), ' ', ''), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(REPLACE($1, ' ', ''), '-', ''), '_', ''))
        LIMIT 1
      `;
      result = await client.query(query, [normalizedUsername]);

    } else {
      // ✅ Enhanced userId-based query with counts
      result = await client.query(
        `SELECT 
           id, name, email, profile_picture_url AS "profilePictureUrl", role, xp_total AS "xpTotal", height, country, sport, position,
           (SELECT COUNT(*) FROM followers WHERE following_id = users.id) AS "followersCount",
           (SELECT COUNT(*) FROM followers WHERE follower_id = users.id) AS "followingCount",
           (SELECT COUNT(*) FROM user_completed_challenges WHERE user_id = users.id) AS "challengesCompleted"
         FROM users 
         WHERE id = $1`,
        [userIdToFetch]
      );
    }

    await client.end();

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(result.rows[0]),
    };

  } catch (err) {
    console.error('Error in getUserInfo:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
