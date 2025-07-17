const { Client } = require('pg');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const method = event.requestContext?.http?.method;

  // Handle OPTIONS request (CORS preflight)
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    // Try to get userId from authorizer, fallback to body for internal calls
    let userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const body = JSON.parse(event.body || '{}');
    if (!userId && body.userId) {
      userId = body.userId;
    }
    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized: No userId provided' })
      };
    }
    console.log('User ID from authorizer:', userId);

    // Parse request body
    const { is_premium_member, is_verified } = body;

    // Validate input
    if (is_premium_member === undefined && is_verified === undefined) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Either is_premium_member or is_verified must be provided' })
      };
    }

    // Build update query
    let updateFields = [];
    let params = [];
    if (is_premium_member !== undefined) {
      updateFields.push(`is_premium_member = $${updateFields.length + 1}`);
      params.push(is_premium_member);
      
      // If setting premium to true, also set premium_start_date
      if (is_premium_member === true) {
        updateFields.push(`premium_start_date = NOW()`);
      } else if (is_premium_member === false) {
        updateFields.push(`premium_start_date = NULL`);
      }
    }
    if (is_verified !== undefined) {
      updateFields.push(`is_verified = $${updateFields.length + 1}`);
      params.push(is_verified);
    }
    // Add user ID parameter
    params.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length}
    `;
    console.log('Update query:', updateQuery);
    console.log('Parameters:', JSON.stringify(params, null, 2));

    // Connect to PostgreSQL
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const updateResult = await client.query(updateQuery, params);
    await client.end();
    console.log('Update result:', JSON.stringify(updateResult, null, 2));

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'User status updated successfully',
        userId: userId,
        updatedFields: {
          is_premium_member,
          is_verified
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 