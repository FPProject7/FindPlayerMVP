const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';

exports.handler = async (event) => {
  // Public access: do not require authentication
  const eventId = event.pathParameters?.eventId;
  if (!eventId) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Missing eventId' }) };
  }
  
  // Query the table using the eventId-index GSI
  const params = {
    TableName: REGISTRATIONS_TABLE,
    IndexName: 'eventId-index',
    KeyConditionExpression: 'eventId = :eventId',
    ExpressionAttributeValues: { ':eventId': eventId },
  };
  
  try {
    const result = await dynamoDb.query(params).promise();
    return { 
      statusCode: 200, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(result.Items) 
    };
  } catch (error) {
    console.error('Error querying registrations:', error);
    return { 
      statusCode: 500, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }) 
    };
  }
}; 