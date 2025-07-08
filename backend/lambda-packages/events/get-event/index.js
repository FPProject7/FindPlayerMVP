const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';

exports.handler = async (event) => {
  // TODO: Validate JWT, parse path params
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const eventId = event.pathParameters?.eventId;
  if (!eventId) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Missing eventId' }) };
  }
  try {
    const result = await dynamoDb.get({ TableName: EVENTS_TABLE, Key: { eventId } }).promise();
    if (!result.Item) {
      return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Event not found' }) };
    }
    // Check if the user is registered for this event
    let isRegistered = false;
    try {
      const regResult = await dynamoDb.query({
        TableName: REGISTRATIONS_TABLE,
        IndexName: process.env.USER_GSI || 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }).promise();
      isRegistered = (regResult.Items && regResult.Items.some(r => r.eventId === eventId));
    } catch (e) {
      // If the query fails, default to not registered
      isRegistered = false;
    }
    const eventWithReg = { ...result.Item, isRegistered };
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify(eventWithReg) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 