// EVENT PAYMENT FLOW:
// 1. Frontend calls this Lambda to create a draft event (status: 'pending_payment', paid: false), gets eventId.
// 2. Frontend calls create-event-checkout-session with eventId to get Stripe Checkout URL.
// 3. On payment, webhook marks event as paid.
// 4. Only paid events are shown as active.
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));
  
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
      },
      body: ''
    };
  }
  
  const userId = event.requestContext?.authorizer?.claims?.sub;
  if (!userId) {
    console.error("Unauthorized: No userId in event.requestContext.authorizer.claims");
    return { 
      statusCode: 401, 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
      }, 
      body: JSON.stringify({ error: 'Unauthorized' }) 
    };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    console.log("Parsed body:", body);
    
    // Validate required fields
    const { title, description, date, time, location, maxParticipants, participationFee, eventType, sport } = body;
    if (!title || !description || !date || !location) {
      return { 
        statusCode: 400, 
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
        },
        body: JSON.stringify({ error: 'title, description, date, and location are required' }) 
      };
    }
    
    // Validate participation fee if provided
    if (participationFee !== undefined && participationFee !== null && participationFee !== '') {
      const feeNumber = parseFloat(participationFee);
      if (isNaN(feeNumber) || feeNumber < 0) {
        return { 
          statusCode: 400, 
          headers: { 
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
          },
          body: JSON.stringify({ error: 'Participation fee must be a valid positive number' }) 
        };
      }
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
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
        },
        body: JSON.stringify({ error: 'Could not determine coordinates for event location.' })
      };
    }
    
    const newEvent = {
      eventId: body.eventId || uuidv4(),
      hostUserId: userId,
      title,
      description,
      date,
      time: time || null,
      eventType: eventType || null,
      sport: sport || null,
      location,
      maxParticipants: maxParticipants || null,
      participationFee: participationFee ? parseFloat(participationFee) : null,
      imageUrl,
      registeredPlayers: 0, // Initialize with 0 registered players
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coordinates,
      status: 'pending_payment', // Mark as draft until payment
      paid: false,
    };
    
    await dynamoDb.put({ TableName: EVENTS_TABLE, Item: newEvent }).promise();
    console.log("Put item succeeded:", newEvent);
    return { 
      statusCode: 201, 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
      }, 
      body: JSON.stringify(newEvent) 
    };
  } catch (err) {
    console.error("Error in create-event:", err);
    return { 
      statusCode: 500, 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token' 
      }, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
}; 