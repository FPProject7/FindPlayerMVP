const { Client } = require('pg');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

exports.handler = async (event) => {
  console.log('=== GET CHALLENGES STARTED ===');
  
  // Safely access authorizer claims
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  const groups = claims?.["cognito:groups"] || [];
  const customRole = claims?.["custom:role"] || "";

  if (!groups.includes("athletes") && customRole !== "athlete") {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Only athletes can fetch challenges" })
    };
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // First, get all challenges
    const challengesResult = await client.query('SELECT * FROM challenges ORDER BY created_at DESC');
    const challenges = challengesResult.rows;
    console.log(`Found ${challenges.length} challenges`);
    
    // If no challenges, return early
    if (challenges.length === 0) {
      await client.end();
      return {
        statusCode: 200,
        body: JSON.stringify([]),
        headers: { 'Content-Type': 'application/json' },
      };
    }
    
    // Only try to get coach info if we have the AWS SDK and environment variables
    if (process.env.USER_POOL_ID) {
      console.log('USER_POOL_ID found, attempting to fetch coach information...');
      
      const cognitoClient = new CognitoIdentityProviderClient({ 
        region: process.env.AWS_REGION || 'us-east-1' 
      });
      
      // Get unique coach IDs to minimize Cognito calls
      const uniqueCoachIds = [...new Set(challenges.map(c => c.coach_id).filter(id => id))];
      console.log(`Found ${uniqueCoachIds.length} unique coach IDs:`, uniqueCoachIds);
      
      if (uniqueCoachIds.length > 0) {
        // Fetch coach information in parallel (much faster)
        const coachInfoPromises = uniqueCoachIds.map(async (coachId) => {
          try {
            console.log(`Fetching coach info for: ${coachId}`);
            const adminGetUserCommand = new AdminGetUserCommand({
              UserPoolId: process.env.USER_POOL_ID,
              Username: coachId
            });
            
            const userDetails = await cognitoClient.send(adminGetUserCommand);
            
            let coachName = 'Unknown Coach';
            if (userDetails.UserAttributes) {
              const nameAttr = userDetails.UserAttributes.find(attr => attr.Name === 'name');
              if (nameAttr) {
                coachName = nameAttr.Value;
              }
            }
            
            console.log(`Coach ${coachId} name: ${coachName}`);
            return { coachId, coachName };
          } catch (cognitoError) {
            console.error(`Error fetching coach info for coach_id ${coachId}:`, cognitoError);
            return { coachId, coachName: 'Unknown Coach' };
          }
        });
        
        // Wait for all coach info to be fetched (with timeout)
        const coachInfoResults = await Promise.allSettled(coachInfoPromises);
        console.log('Coach info fetch completed');
        
        // Create a map for quick lookup
        const coachInfoMap = {};
        coachInfoResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { coachId, coachName } = result.value;
            coachInfoMap[coachId] = coachName;
          }
        });
        
        // Add coach information to challenges
        const challengesWithCoachInfo = challenges.map(challenge => ({
          ...challenge,
          coach_name: challenge.coach_id ? (coachInfoMap[challenge.coach_id] || 'Unknown Coach') : 'Unknown Coach'
        }));
        
        await client.end();
        console.log('Returning challenges with coach info');
        
        return {
          statusCode: 200,
          body: JSON.stringify(challengesWithCoachInfo),
          headers: { 'Content-Type': 'application/json' },
        };
      }
    }
    
    // Fallback: return challenges with placeholder coach names
    console.log('Using fallback coach names');
    const challengesWithCoachInfo = challenges.map(challenge => ({
      ...challenge,
      coach_name: 'Coach Name' // Placeholder
    }));
    
    await client.end();
    return {
      statusCode: 200,
      body: JSON.stringify(challengesWithCoachInfo),
      headers: { 'Content-Type': 'application/json' },
    };
    
  } catch (err) {
    console.error('=== ERROR OCCURRED ===');
    console.error('Error type:', err.constructor.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching challenges', error: err.message }),
    };
  }
};
