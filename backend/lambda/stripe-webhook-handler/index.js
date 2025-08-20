const https = require('https');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

// You should set this to your Stripe webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Update this to your actual API Gateway host and path
const UPDATE_USER_STATUS_HOST = 'y219q4oqh5.execute-api.us-east-1.amazonaws.com';
const UPDATE_USER_STATUS_PATH = '/default/update-user-status';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Webhook received:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let stripeEvent;

  try {
    // Verify the webhook signature
    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    console.log('Webhook event verified:', stripeEvent.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const userId = session.metadata ? session.metadata.userId : null;
      const customerId = session.customer;

      console.log('Processing checkout.session.completed:', { userId, customerId });

      if (userId && customerId) {
        const client = new Client({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
          ssl: { rejectUnauthorized: false }
        });
        
        try {
          console.log('Connecting to database...');
          await client.connect();
          console.log('Database connected. Updating stripe_customer_id...');
          
          await client.query(
            'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
            [customerId, userId]
          );
          console.log('Database update successful for userId:', userId);
        } catch (dbErr) {
          console.error('Database error:', dbErr);
          throw dbErr;
        } finally {
          await client.end();
          console.log('Database connection closed.');
        }
      } else {
        console.log('Missing userId or customerId:', { userId, customerId });
      }

      if (userId) {
        // Call update-user-status endpoint to set premium
        try {
          const data = JSON.stringify({ is_premium_member: true, userId });
          const options = {
            hostname: UPDATE_USER_STATUS_HOST,
            path: UPDATE_USER_STATUS_PATH,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          };

          await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
              console.log('Update user status response:', res.statusCode);
              res.on('data', () => {}); // Consume response
              res.on('end', resolve);
            });
            req.on('error', (err) => {
              console.error('Update user status request failed:', err);
              reject(err);
            });
            req.write(data);
            req.end();
          });
          console.log('Premium status updated for userId:', userId);
        } catch (updateErr) {
          console.error('Failed to update premium status:', updateErr);
          // Don't fail the webhook if this call fails
        }
      }
    }

    if (
      stripeEvent.type === 'customer.subscription.updated' ||
      stripeEvent.type === 'customer.subscription.deleted'
    ) {
      const subscription = stripeEvent.data.object;
      const customerId = subscription.customer;
      const currentPeriodEnd = subscription.current_period_end * 1000; // convert to ms
      const isCanceled = subscription.status === 'canceled' || subscription.cancel_at_period_end;

      console.log('Processing subscription event:', { 
        type: stripeEvent.type, 
        customerId, 
        isCanceled, 
        currentPeriodEnd: new Date(currentPeriodEnd) 
      });

      if (customerId) {
        if (isCanceled && Date.now() > currentPeriodEnd) {
          // Remove premium status after period ends
          const client = new Client({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
            ssl: { rejectUnauthorized: false }
          });
          
          let userId = null;
          try {
            await client.connect();
            const res = await client.query('SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]);
            if (res.rows.length > 0) {
              userId = res.rows[0].id;
              
              // Call update-user-status endpoint to remove premium
              const data = JSON.stringify({ is_premium_member: false, userId });
              const options = {
                hostname: UPDATE_USER_STATUS_HOST,
                path: UPDATE_USER_STATUS_PATH,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              };
              
              await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                  console.log('Remove premium response:', res.statusCode);
                  res.on('data', () => {});
                  res.on('end', resolve);
                });
                req.on('error', reject);
                req.write(data);
                req.end();
              });
              console.log('Premium removed for userId:', userId);
            } else {
              console.log('No user found for stripe_customer_id:', customerId);
            }
          } catch (err) {
            console.error('Error handling subscription cancellation:', err);
          } finally {
            await client.end();
          }
        } else {
          console.log('Subscription canceled but still active until:', new Date(currentPeriodEnd));
        }
      }
    }

    if (stripeEvent.type === 'identity.verification_session.verified') {
      const session = stripeEvent.data.object;
      const userId = session.metadata && session.metadata.userId;
      
      console.log('Processing identity verification:', { userId });
      
      if (userId) {
        // Mark user as verified in DB
        const client = new Client({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
          ssl: { rejectUnauthorized: false }
        });
        
        try {
          await client.connect();
          await client.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
          console.log('User verified via Stripe Identity:', userId);
        } catch (err) {
          console.error('Error updating user verification status:', err);
        } finally {
          await client.end();
        }
      } else {
        console.log('No userId found in Stripe Identity session metadata.');
      }
    }

    console.log('Webhook processed successfully');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ received: true, event_type: stripeEvent.type }),
    };
    
  } catch (error) {
    console.error('Webhook processing error:', error);
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