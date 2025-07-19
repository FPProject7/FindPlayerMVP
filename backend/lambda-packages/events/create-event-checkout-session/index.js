const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
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

    // Temporarily allow requests without userId for testing
    if (!eventDraft) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing eventDraft' }),
      };
    }
    
    // Use a default userId if not provided (for testing)
    const finalUserId = userId || 'test-user-id';

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
          userId: finalUserId,
          eventId,
          eventTitle: eventDraft.title || '',
          eventDraft: JSON.stringify(eventDraft), // Store full event draft
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