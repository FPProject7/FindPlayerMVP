const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== LAMBDA FUNCTION STARTED ===');
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  console.log('JWT Claims:', JSON.stringify(claims, null, 2));
  
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";
  const coachId = claims?.sub;  // Assuming sub is the coach ID
  
  console.log('Groups:', groups);
  console.log('Custom Role:', customRole);
  console.log('Coach ID:', coachId);

  console.log('Database environment variables:');
  console.log('DB_HOST:', process.env.DB_HOST ? 'Set' : 'Not set');
  console.log('DB_USER:', process.env.DB_USER ? 'Set' : 'Not set');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'Set' : 'Not set');
  console.log('DB_NAME:', process.env.DB_NAME ? 'Set' : 'Not set');

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Database connection successful!');

    let query, values;
    if (groups.includes("coaches") || customRole === "coach") {
      query = `
        SELECT 
          s.*, 
          c.title AS challenge_title,
          u.name AS athlete_name,
          u.profile_picture_url AS athlete_profile_picture_url
        FROM challenge_submissions s
        JOIN challenges c ON s.challenge_id = c.id
        LEFT JOIN users u ON s.athlete_id = u.id
        WHERE c.coach_id = $1::text
          AND s.status = 'pending'
        ORDER BY s.submitted_at DESC
      `;
      values = [coachId];
      console.log('Executing query with coachId:', coachId);
    } else {
      console.log('User is not a coach. Groups:', groups, 'Custom role:', customRole);
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "Forbidden: Invalid role" })
      };
    }

    console.log('Executing query:', query);
    console.log('Query values:', values);
    
    const res = await client.query(query, values);
    console.log('Query executed successfully. Rows returned:', res.rows.length);
    
    await client.end();
    console.log('Database connection closed');

    // Return submissions with athlete info (without pre-signed URLs for now)
    const submissionsWithInfo = res.rows.map((row) => ({
      ...row,
      athlete_name: row.athlete_name || 'Unknown',
    }));

    console.log('Returning submissions:', submissionsWithInfo);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submissionsWithInfo)
    };

  } catch (err) {
    console.error('=== ERROR OCCURRED ===');
    console.error('Error type:', err.constructor.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    if (client) {
      await client.end();
      console.log('Database connection closed due to error');
    }
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: 'Error fetching submissions', 
        error: err.message,
        errorType: err.constructor.name
      })
    };
  }
};