const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    console.error("Unauthorized: No userId in event.requestContext.authorizer.claims");
    return { statusCode: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    console.log("Parsed body:", body);
    
    // Validate required fields
    const { title, description, date, location, maxParticipants } = body;
    if (!title || !description || !date || !location) {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
        body: JSON.stringify({ error: 'title, description, date, and location are required' }) 
      };
    }
    
    // Handle image URL (optional)
    const imageUrl = body.imageUrl || null;
    
    // Ensure coordinates are present
    let coordinates = body.coordinates;
    if (!coordinates && body.location && GOOGLE_MAPS_API_KEY) {
      // Geocode the location string
      try {
        const geoResp = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: body.location, key: GOOGLE_MAPS_API_KEY }
        });
        if (geoResp.data && geoResp.data.results && geoResp.data.results[0]) {
          const loc = geoResp.data.results[0].geometry.location;
          coordinates = { lat: loc.lat, lng: loc.lng };
        }
      } catch (geoErr) {
        console.error('Geocoding failed:', geoErr);
      }
    }
    if (!coordinates) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
        body: JSON.stringify({ error: 'Could not determine coordinates for event location.' })
      };
    }
    
    const newEvent = {
      eventId: uuidv4(),
      hostUserId: userId,
      title,
      description,
      date,
      location,
      maxParticipants: maxParticipants || null,
      imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coordinates,
    };
    
    await dynamoDb.put({ TableName: EVENTS_TABLE, Item: newEvent }).promise();
    console.log("Put item succeeded:", newEvent);
    return { statusCode: 201, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify(newEvent) };
  } catch (err) {
    console.error("Error in create-event:", err);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' }, body: JSON.stringify({ error: err.message }) };
  }
}; 