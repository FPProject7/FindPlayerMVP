const { Client } = require('pg');

exports.handler = async (event) => {
  // Robust method detection for both REST and HTTP API Gateway events
  const method = event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod || event.requestContext?.requestMethod;
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
    
    // Extract claims for both REST and HTTP API Gateway events
    let claims = event?.requestContext?.authorizer?.jwt?.claims
      || event?.requestContext?.authorizer?.claims
      || event?.requestContext?.authorizer
      || {};
    console.log('Claims:', JSON.stringify(claims, null, 2));
    
    const customRole = claims?.["custom:role"] || "";
    console.log('Custom role:', customRole);
    
    // Only athletes can access submission quota information
    if (customRole !== "athlete") {
      console.log('Access denied - not an athlete. Role:', customRole);
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Forbidden: Only athletes can access submission quota information"
        })
      };
    }

    const athleteId = claims?.sub;
    if (!athleteId) {
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

    // Get athlete's premium status
    const userResult = await client.query(
      'SELECT is_premium_member FROM users WHERE id = $1',
      [athleteId]
    );
    
    if (userResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: 'Athlete not found' })
      };
    }

    const isPremium = userResult.rows[0].is_premium_member;
    const maxSubmissions = isPremium ? 3 : 1; // Premium: 3/period, Free: 1/period
    // Change quota window from 1 day to 5 minutes for testing
    const minutesBack = 5;

    // Count submissions in the last 5 minutes
    const quotaResult = await client.query(
      `SELECT COUNT(*) as submission_count 
       FROM challenge_submissions 
       WHERE athlete_id = $1
         AND submitted_at >= NOW() - INTERVAL '${minutesBack} minutes'`,
      [athleteId]
    );

    const currentCount = parseInt(quotaResult.rows[0].submission_count);
    
    await client.end();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        current: currentCount,
        max: maxSubmissions,
        period: `${minutesBack} minutes`,
        isPremium: isPremium,
        remaining: Math.max(0, maxSubmissions - currentCount)
      })
    };
  } catch (error) {
    console.error('Error getting submission quota:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: 'Error getting submission quota information',
        error: error.message 
      })
    };
  }
}; 