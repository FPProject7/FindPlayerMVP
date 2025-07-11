const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    let body;
    if (event.scoutId && event.athleteId) {
      body = event;
    } else if (event.body) {
      if (typeof event.body === 'string') {
        body = JSON.parse(event.body);
      } else {
        body = event.body;
      }
    } else {
      body = {};
    }
    let scoutId = body.scoutId || body.scout_id || event.pathParameters?.scoutId;
    let athleteId = body.athleteId || body.athlete_id || event.pathParameters?.athleteId;
    if (!scoutId || !athleteId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'Missing scoutId or athleteId' })
      };
    }
    const client = new Client();
    await client.connect();
    // Check if already starred
    const check = await client.query(
      'SELECT id FROM starred_players WHERE scout_id = $1 AND athlete_id = $2',
      [scoutId, athleteId]
    );
    if (check.rows.length > 0) {
      await client.end();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ success: true, message: 'Player already starred' })
      };
    }
    // Insert new star
    await client.query(
      'INSERT INTO starred_players (scout_id, athlete_id, created_at) VALUES ($1, $2, NOW())',
      [scoutId, athleteId]
    );
    await client.end();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ success: true, message: 'Player starred successfully' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
}; 