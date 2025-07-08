const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';

// CORS headers for Lambda Proxy Integration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({})
    };
  }

  // TODO: Validate JWT, parse event body, validate input
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    return { 
      statusCode: 401, 
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' }) 
    };
  }
  
  const body = JSON.parse(event.body || '{}');
  // Prefer eventId from pathParameters, fallback to body
  const eventId = event.pathParameters?.eventId || body.eventId;
  if (!eventId) {
    return { 
      statusCode: 400, 
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing eventId' }) 
    };
  }
  
  // TODO: Check if already registered, event exists, etc.
  const registration = {
    registrationId: uuidv4(),
    eventId,
    userId,
    registeredAt: new Date().toISOString(),
  };
  
  await dynamoDb.put({ TableName: REGISTRATIONS_TABLE, Item: registration }).promise();

  // Increment registeredPlayers count atomically
  await dynamoDb.update({
    TableName: EVENTS_TABLE,
    Key: { eventId },
    UpdateExpression: 'SET registeredPlayers = if_not_exists(registeredPlayers, :zero) + :inc',
    ExpressionAttributeValues: {
      ':inc': 1,
      ':zero': 0
    }
  }).promise();
  
  return { 
    statusCode: 201, 
    headers: corsHeaders,
    body: JSON.stringify(registration) 
  };
}; 