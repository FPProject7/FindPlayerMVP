const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';

exports.handler = async (event) => {
  // TODO: Validate JWT
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  // TODO: Use GSI if available
  const params = {
    TableName: REGISTRATIONS_TABLE,
    IndexName: process.env.USER_GSI || 'userId-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };
  try {
    const result = await dynamoDb.query(params).promise();
    // Only return future events
    const now = new Date();
    const eventsDynamo = new AWS.DynamoDB.DocumentClient();
    const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
    const registrations = result.Items || [];
    const futureEvents = [];
    for (const reg of registrations) {
      if (!reg.eventId) continue;
      try {
        const eventRes = await eventsDynamo.get({ TableName: EVENTS_TABLE, Key: { eventId: reg.eventId } }).promise();
        const event = eventRes.Item;
        if (!event) continue;
        if (!event.date) { futureEvents.push(event); continue; }
        const eventDateTime = new Date(event.date + 'T' + (event.time || '00:00'));
        if (eventDateTime >= now) futureEvents.push(event);
      } catch (e) { continue; }
    }
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ events: futureEvents }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 