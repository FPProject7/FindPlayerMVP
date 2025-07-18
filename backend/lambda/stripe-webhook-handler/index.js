const https = require('https');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Client } = require('pg');

// You should set this to your Stripe webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Update this to your actual API Gateway host and path
const UPDATE_USER_STATUS_HOST = 'y219q4oqh5.execute-api.us-east-1.amazonaws.com';
const UPDATE_USER_STATUS_PATH = '/default/update-user-status';

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata ? session.metadata.userId : null;
    const customerId = session.customer;

    console.log('Webhook received checkout.session.completed:', { userId, customerId });

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
        console.log('Attempting DB connection...');
        await client.connect();
        console.log('DB connected. Running update query...');
        await client.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, userId]
        );
        console.log('DB update successful for userId:', userId);
      } catch (err) {
        console.error('Error updating stripe_customer_id:', err);
        throw err;
      } finally {
        await client.end();
        console.log('DB connection closed.');
      }
    } else {
      console.log('Missing userId or customerId:', { userId, customerId });
    }

    if (userId) {
      // Call update-user-status endpoint to set premium
      const data = JSON.stringify({ is_premium_member: true, userId });
      const options = {
        hostname: UPDATE_USER_STATUS_HOST,
        path: UPDATE_USER_STATUS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer ...', // Add if your endpoint requires auth
        },
      };

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          res.on('data', () => {}); // Consume response
          res.on('end', resolve);
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
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

    if (customerId) {
      if (isCanceled && Date.now() > currentPeriodEnd) {
        // Remove premium status after period ends
        // Find user by stripe_customer_id
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

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ received: true }),
  };
}; 