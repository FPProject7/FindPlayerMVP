const AWS = require('aws-sdk');
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
  
  // Find registrationId for this user/event
  let registrationId;
  try {
    const regResult = await dynamoDb.query({
      TableName: REGISTRATIONS_TABLE,
      IndexName: process.env.USER_GSI || 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();
    const reg = (regResult.Items || []).find(r => r.eventId === eventId);
    if (!reg) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Registration not found for this user and event.' })
      };
    }
    registrationId = reg.registrationId;
  } catch (e) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to find registration.' })
    };
  }

  await dynamoDb.delete({ TableName: REGISTRATIONS_TABLE, Key: { registrationId } }).promise();

  // Decrement registeredPlayers count atomically, but not below zero
  await dynamoDb.update({
    TableName: EVENTS_TABLE,
    Key: { eventId },
    UpdateExpression: 'SET registeredPlayers = if_not_exists(registeredPlayers, :zero) - :dec',
    ConditionExpression: 'registeredPlayers > :zero',
    ExpressionAttributeValues: {
      ':dec': 1,
      ':zero': 0
    }
  }).promise();
  
  return { 
    statusCode: 200, 
    headers: corsHeaders,
    body: JSON.stringify({ success: true }) 
  };
}; 