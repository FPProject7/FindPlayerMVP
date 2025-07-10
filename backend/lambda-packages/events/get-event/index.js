const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';

exports.handler = async (event) => {
  // Debug: log request context and headers
  console.log('event.requestContext:', JSON.stringify(event.requestContext));
  console.log('event.headers:', JSON.stringify(event.headers));

  // Extract userId from JWT if Authorization header is present
  let userId;
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      // Decode JWT to extract userId (sub claim)
      const decoded = jwt.decode(token);
      userId = decoded?.sub;
      console.log('JWT decoded successfully, userId:', userId);
    } catch (err) {
      console.log('JWT decode error:', err);
      userId = undefined;
    }
  } else {
    // Fallback to API Gateway authorizer if available
    userId = event.requestContext?.authorizer?.claims?.sub;
  }
  
  const eventId = event.pathParameters?.eventId;
  console.log('Lambda userId:', userId);
  console.log('Lambda eventId:', eventId);
  
  if (!eventId) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Missing eventId' }) };
  }
  
  try {
    const result = await dynamoDb.get({ TableName: EVENTS_TABLE, Key: { eventId } }).promise();
    if (!result.Item) {
      return { statusCode: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Event not found' }) };
    }
    
    // Dynamically calculate current participant count from registrations table
    let currentParticipantCount = 0;
    try {
      const participantResult = await dynamoDb.query({
        TableName: REGISTRATIONS_TABLE,
        IndexName: 'eventId-index',
        KeyConditionExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId
        }
      }).promise();
      currentParticipantCount = participantResult.Items.length;
      console.log('Current participant count:', currentParticipantCount);
    } catch (e) {
      console.log('Error calculating participant count:', e);
      currentParticipantCount = 0;
    }
    
    // Always include isRegistered, default to false
    let eventResponse = { 
      ...result.Item, 
      isRegistered: false,
      currentParticipantCount: currentParticipantCount
    };
    
    // If userId is present, check if the user is registered for this event
    if (userId) {
      try {
        const regResult = await dynamoDb.query({
          TableName: REGISTRATIONS_TABLE,
          IndexName: process.env.USER_GSI || 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        }).promise();
        // Debug: log registration records and eventId
        console.log('Checking registration for userId:', userId, 'eventId:', eventId);
        console.log('User registrations:', regResult.Items);
        const eventIds = regResult.Items.map(r => r.eventId);
        const userIds = regResult.Items.map(r => r.userId);
        console.log('Event IDs for user:', eventIds);
        console.log('User IDs in records:', userIds);
        // Explicitly compare all eventIds and userIds
        const isRegistered = regResult.Items.some(r => {
          const eventMatch = String(r.eventId).trim() === String(eventId).trim();
          const userMatch = String(r.userId).trim() === String(userId).trim();
          console.log('Comparing eventId:', r.eventId, 'with', eventId, '| userId:', r.userId, 'with', userId, '| eventMatch:', eventMatch, '| userMatch:', userMatch);
          return eventMatch && userMatch;
        });
        eventResponse.isRegistered = isRegistered;
        console.log('isRegistered:', isRegistered);
      } catch (e) {
        eventResponse.isRegistered = false;
        console.log('Registration check error:', e);
      }
    }
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify(eventResponse) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 