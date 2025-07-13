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
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    // Delete the star
    const result = await client.query(
      'DELETE FROM starred_players WHERE scout_id = $1 AND athlete_id = $2 RETURNING id',
      [scoutId, athleteId]
    );
    await client.end();
    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ success: false, message: 'Starred player not found' })
      };
    }
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ success: true, message: 'Player unstarred successfully' })
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