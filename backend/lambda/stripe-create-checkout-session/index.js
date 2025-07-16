const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Map userType and billingPeriod to Stripe Price IDs (test mode)
const priceMap = {
  athlete: {
    monthly: 'price_1RlBIS1Bdg9XFcbAWUgv7dlY', // 9.99
    yearly: 'price_1RlBIS1Bdg9XFcbAWUgv7dlY',  // 99.99 (using same ID for now)
  },
  // Add coach and scout when you create their test prices
};

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userType, billingPeriod, userId } = body;

    if (!userType || !billingPeriod || !priceMap[userType] || !priceMap[userType][billingPeriod]) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid userType or billingPeriod' }),
      };
    }

    const priceId = priceMap[userType][billingPeriod];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://findplayer.app/profile',
      cancel_url: 'https://findplayer.app/profile',
      metadata: { userId: userId || '' }, // Optionally pass userId for later reference
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 