const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // TODO: Implement Stripe webhook signature verification and event handling
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}; 