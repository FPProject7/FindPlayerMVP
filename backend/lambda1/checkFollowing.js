console.log('Starting checkFollowing Lambda function...');

let Client;
try {
  const pg = require('pg');
  Client = pg.Client;
  console.log('pg module loaded successfully');
} catch (error) {
  console.error('Failed to load pg module:', error);
  throw error;
}

exports.handler = async (event) => {
  console.log('checkFollowing Lambda invoked with event:', JSON.stringify(event, null, 2));
  
  try {
    let followerId, followingId;

    // Check if coming from query parameters or body (depends on API setup)
    if (event.queryStringParameters) {
      followerId = event.queryStringParameters.followerId;
      followingId = event.queryStringParameters.followingId;
    } else {
      const body = JSON.parse(event.body);
      followerId = body.followerId;
      followingId = body.followingId;
    }

    console.log('Extracted followerId:', followerId, 'followingId:', followingId);

    if (!followerId || !followingId) {
      console.log('Missing required parameters');
      return { statusCode: 400, body: JSON.stringify({ message: 'followerId and followingId are required' }) };
    }

    console.log('Connecting to database...');
    const client = new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connected successfully');

    const result = await client.query(
      `SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    console.log('Query result:', result.rowCount, 'rows found');

    await client.end();
    console.log('Database connection closed');

    return {
      statusCode: 200,
      body: JSON.stringify({
        isFollowing: result.rowCount > 0
      })
    };

  } catch (err) {
    console.error('Error in checkFollowing:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', details: err.message })
    };
  }
};
