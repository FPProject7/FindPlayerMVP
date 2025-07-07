const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

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
  // TODO: Check if already registered, event exists, etc.
  const registration = {
    registrationId: uuidv4(),
    eventId,
    userId,
    registeredAt: new Date().toISOString(),
  };
  await dynamoDb.put({ TableName: REGISTRATIONS_TABLE, Item: registration }).promise();
  return { statusCode: 201, body: JSON.stringify(registration) };
}; 