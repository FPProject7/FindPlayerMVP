const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';

exports.handler = async (event) => {
  // Public access: do not require authentication for listing events
  // (If you want to add user-specific filtering for signed-in users, you can check userId below, but do not block public access)
  // const userId = event.requestContext?.authorizer?.claims?.sub;

  // TODO: Add filters, pagination, etc.
  const params = {
    TableName: EVENTS_TABLE,
    // Optionally add FilterExpression, etc.
  };
  try {
    const result = await dynamoDb.scan(params).promise();
    // Only return future events
    const now = new Date();
    const futureEvents = (result.Items || []).filter(event => {
      if (!event.date) return true;
      const eventDateTime = new Date(event.date + 'T' + (event.time || '00:00'));
      return eventDateTime >= now;
    });
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ events: futureEvents }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 