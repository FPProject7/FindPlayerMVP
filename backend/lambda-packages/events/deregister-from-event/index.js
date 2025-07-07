const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';

exports.handler = async (event) => {
  // TODO: Validate JWT, parse event body, validate input
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const body = JSON.parse(event.body || '{}');
  // Prefer eventId from pathParameters, fallback to body
  const eventId = event.pathParameters?.eventId || body.eventId;
  if (!eventId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing eventId' }) };
  }
  // TODO: Find registrationId for this user/event
  // For now, assume registrationId is provided (to be improved)
  const { registrationId } = body;
  if (!registrationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing registrationId' }) };
  }
  await dynamoDb.delete({ TableName: REGISTRATIONS_TABLE, Key: { registrationId } }).promise();
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
}; 