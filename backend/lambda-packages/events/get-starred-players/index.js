const { Client } = require('pg');

exports.handler = async (event) => {
  try {
    let scoutId = event.pathParameters?.scoutId || event.queryStringParameters?.scoutId;
    if (!scoutId && event.body) {
      let body;
      if (typeof event.body === 'string') {
        body = JSON.parse(event.body);
      } else {
        body = event.body;
      }
      scoutId = body.scoutId || body.scout_id;
    }
    if (!scoutId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({ error: 'Missing scoutId' })
      };
    }
    const client = new Client();
    await client.connect();
    const result = await client.query(
      `SELECT
          sp.athlete_id,
          u.name,
          u.email,
          u.profile_picture_url
       FROM starred_players sp
       JOIN users u ON sp.athlete_id = u.id
       WHERE sp.scout_id = $1
       ORDER BY sp.created_at DESC
       LIMIT 50`,
      [scoutId]
    );
    const starredPlayers = result.rows.map(row => ({
      athleteId: row.athlete_id,
      name: row.name,
      email: row.email,
      img: row.profile_picture_url
    }));
    await client.end();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ success: true, starred: starredPlayers, count: starredPlayers.length })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
}; 