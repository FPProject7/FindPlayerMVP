const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Map userType and billingPeriod to Stripe Price IDs (production mode)
const priceMap = {
  athlete: {
    monthly: 'price_1RkpE91Bdg9XFcbAJKIwibLv', // Athlete Premium (monthly)
    yearly: 'price_1RkpEn1Bdg9XFcbAc06lumxp',  // Athlete Premium (yearly)
  },
  coach: {
    monthly: 'price_1RkpFY1Bdg9XFcbACo1vwvVM', // Coach Premium (monthly)
    yearly: 'price_1RkpFx1Bdg9XFcbAw6XjKrok',  // Coach Premium (yearly)
  },
  scout: {
    monthly: 'price_1RkpGV1Bdg9XFcbAzKUr8Aqb', // Scout Premium (monthly)
    yearly: 'price_1RkpGw1Bdg9XFcbANgA5rNha',  // Scout Premium (yearly)
  },
};

exports.handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userType, billingPeriod, userId, returnUrl } = body;

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
      success_url: returnUrl || 'https://findplayer.app/profile',
      cancel_url: returnUrl || 'https://findplayer.app/profile',
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