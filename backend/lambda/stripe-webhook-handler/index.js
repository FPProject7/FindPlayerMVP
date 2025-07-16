const https = require('https');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

    if (userId) {
      // Call update-user-status endpoint to set premium
      const data = JSON.stringify({ is_premium_member: true });
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

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ received: true }),
  };
}; 