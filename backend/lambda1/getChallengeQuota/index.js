const { Client } = require('pg');

exports.handler = async (event) => {
  // Detect HTTP method for both REST and HTTP API Gateway events
  const method = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod;
  console.log('Detected method:', method);
  if (method === 'OPTIONS') {
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
    // Debug logging
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('RequestContext:', JSON.stringify(event?.requestContext, null, 2));
    console.log('Authorizer:', JSON.stringify(event?.requestContext?.authorizer, null, 2));
    
    // Extract claims
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    console.log('Claims:', JSON.stringify(claims, null, 2));
    
    const customRole = claims?.["custom:role"] || "";
    console.log('Custom role:', customRole);
    
    // Only coaches can access quota information
    if (customRole !== "coach") {
      console.log('Access denied - not a coach. Role:', customRole);
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Forbidden: Only coaches can access challenge quota information"
        })
      };
    }

    const coachId = claims?.sub;
    if (!coachId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "User ID not found in token" })
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

    // Get coach's premium status
    const userResult = await client.query(
      'SELECT is_premium_member FROM users WHERE id = $1',
      [coachId]
    );
    
    if (userResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: 'Coach not found' })
      };
    }

    const isPremium = userResult.rows[0].is_premium_member;
    const maxChallenges = isPremium ? 5 : 3; // Premium: 5/week, Free: 3/week
    // Change quota window from 7 days to 5 minutes for testing
    const minutesBack = 5;

    // Count challenges created in the last 7 days
    const quotaResult = await client.query(
      `SELECT COUNT(*) as challenge_count 
       FROM challenges 
       WHERE coach_id = $1 
       AND created_at >= NOW() - INTERVAL '${minutesBack} minutes'`,
      [coachId]
    );

    const currentCount = parseInt(quotaResult.rows[0].challenge_count);
    
    await client.end();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        current: currentCount,
        max: maxChallenges,
        period: `${minutesBack} minutes`,
        isPremium: isPremium,
        remaining: Math.max(0, maxChallenges - currentCount)
      })
    };
  } catch (error) {
    console.error('Error getting challenge quota:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: 'Error getting challenge quota information',
        error: error.message 
      })
    };
  }
}; 