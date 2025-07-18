const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userId, returnUrl } = body;
    if (!userId || !returnUrl) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing userId or returnUrl' }),
      };
    }

    // Get user data from database
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    const userResult = await client.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    await client.end();

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    const user = userResult.rows[0];

    // Create verification session with user data
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: returnUrl,
      provided_details: {
        email: user.email, // Pre-fill email
      }
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Error creating verification session:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 