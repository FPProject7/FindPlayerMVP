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
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Get the most viewed athletes of the week
    // Count unique scout-athlete profile view pairs in the last 7 days
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.profile_picture_url,
        u.date_of_birth,
        u.position,
        u.height,
        u.weight,
        u.xp_total,
        u.country,
        COUNT(DISTINCT n.from_user_id) as view_count
      FROM users u
      LEFT JOIN notifications n ON u.id = n.to_user_id 
        AND n.type = 'profile_view' 
        AND n.created_at > NOW() - INTERVAL '7 days'
      WHERE u.role = 'athlete' 
        AND u.gender = 'Male'
      GROUP BY u.id, u.name, u.email, u.profile_picture_url, u.date_of_birth, u.position, u.height, u.weight, u.xp_total, u.country
      HAVING COUNT(DISTINCT n.from_user_id) > 0
      ORDER BY view_count DESC, u.xp_total DESC
      LIMIT 10
    `;

    const result = await client.query(query);
    
    // Also get view count for grinder of the week (top XP earner of the week)
    const grinderQuery = `
      SELECT 
        u.id,
        COUNT(DISTINCT n.from_user_id) as view_count
      FROM users u
      LEFT JOIN notifications n ON u.id = n.to_user_id 
        AND n.type = 'profile_view' 
        AND n.created_at > NOW() - INTERVAL '7 days'
      WHERE u.role = 'athlete' 
        AND u.gender = 'Male'
      GROUP BY u.id
      ORDER BY u.xp_total DESC
      LIMIT 1
    `;
    
    const grinderResult = await client.query(grinderQuery);
    await client.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: {
          mostViewedAthletes: result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            profilePictureUrl: row.profile_picture_url,
            dateOfBirth: row.date_of_birth,
            position: row.position,
            height: row.height,
            weight: row.weight,
            xpTotal: row.xp_total,
            country: row.country,
            viewCount: parseInt(row.view_count)
          })),
          grinderViewCount: grinderResult.rows.length > 0 ? parseInt(grinderResult.rows[0].view_count) : 0
        }
      })
    };
  } catch (err) {
    console.error('Error in getMostViewedAthletes:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ 
        success: false,
        error: err.message 
      })
    };
  }
}; 