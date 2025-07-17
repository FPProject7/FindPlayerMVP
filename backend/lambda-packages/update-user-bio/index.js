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
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { bio, userId } = body;

    // Validate required fields
    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    if (!bio) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'bio is required' })
      };
    }

    // Validate bio length (max 75 characters)
    if (bio.length > 75) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Bio must be 75 characters or less' })
      };
    }

    // Create database client
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Update user bio
    const updateQuery = `
      UPDATE users 
      SET bio = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, bio, updated_at
    `;
    
    const result = await client.query(updateQuery, [bio, userId]);
    await client.end();

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const updatedUser = result.rows[0];
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Bio updated successfully',
        userId: updatedUser.id,
        bio: updatedUser.bio,
        updatedAt: updatedUser.updated_at
      })
    };

  } catch (error) {
    console.error('Error updating user bio:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
}; 