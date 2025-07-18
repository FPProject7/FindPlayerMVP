const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';

exports.handler = async (event) => {
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid event body' }) };
  }

  // Handle Stripe webhook events
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    // Check if this is an event creation payment (mode: payment, has eventId in metadata)
    if (session.mode === 'payment' && session.metadata && session.metadata.eventId) {
      const eventId = session.metadata.eventId;
      // Mark the event as paid in DynamoDB (add a paid: true attribute)
      try {
        await dynamoDb.update({
          TableName: EVENTS_TABLE,
          Key: { eventId },
          UpdateExpression: 'SET #paid = :paid, updatedAt = :now',
          ExpressionAttributeNames: { '#paid': 'paid' },
          ExpressionAttributeValues: { ':paid': true, ':now': new Date().toISOString() },
        }).promise();
      } catch (dbErr) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update event as paid', details: dbErr.message }) };
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}; 