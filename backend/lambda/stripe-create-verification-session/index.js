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

    // Validate returnUrl format
    try {
      const url = new URL(returnUrl);
      // Ensure it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Return URL must be a valid HTTP or HTTPS URL' }),
        };
      }
    } catch (urlError) {
      console.error('Invalid returnUrl:', returnUrl, urlError);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid return URL format' }),
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

    console.log('Creating verification session with returnUrl:', returnUrl);

    // Create verification session with user data
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: returnUrl,
      customer: user.stripe_customer_id, // Link to Stripe customer
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
    
    // Check if it's a Stripe error about invalid URL
    if (error.message && error.message.includes('url')) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid return URL format. Please ensure the URL is properly formatted.' }),
      };
    }
    
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 