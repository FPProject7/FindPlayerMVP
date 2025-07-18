const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userId, eventDraft, returnUrl } = body;

    if (!userId || !eventDraft) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing userId or eventDraft' }),
      };
    }

    // $100 event creation fee (test price ID)
    const EVENT_CREATION_PRICE_ID = process.env.EVENT_CREATION_PRICE_ID || 'price_1Nw7QwJQwJQwJQwJQwJQwJQw'; // <-- TEST VALUE

    // Generate a draft eventId for reconciliation
    const eventId = eventDraft.eventId || uuidv4();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: EVENT_CREATION_PRICE_ID, quantity: 1 }],
      success_url: returnUrl || 'https://findplayer.app/events',
      cancel_url: returnUrl || 'https://findplayer.app/events',
      metadata: {
        userId,
        eventId,
        eventTitle: eventDraft.title || '',
      },
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ url: session.url, eventId }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 