const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';

exports.handler = async (event) => {
  // TODO: Validate JWT
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  // TODO: Use GSI if available
  const params = {
    TableName: EVENTS_TABLE,
    IndexName: process.env.HOST_USER_GSI || 'hostUserId-index',
    KeyConditionExpression: 'hostUserId = :hostUserId',
    ExpressionAttributeValues: { ':hostUserId': userId },
  };
  try {
    const result = await dynamoDb.query(params).promise();
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