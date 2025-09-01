const { Client } = require('pg');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

// Create verifiers once per container
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID; // optional
let accessTokenVerifier;
let idTokenVerifier;
if (USER_POOL_ID) {
  accessTokenVerifier = CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: 'access' });
  if (CLIENT_ID) {
    idTokenVerifier = CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: 'id', clientId: CLIENT_ID });
  }
}

async function extractUserIdFromAuthHeader(headers) {
  try {
    const auth = headers?.Authorization || headers?.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();

    if (accessTokenVerifier) {
      try {
        const payload = await accessTokenVerifier.verify(token);
        return payload?.sub || null;
      } catch (_) {}
    }
    if (idTokenVerifier) {
      try {
        const payload = await idTokenVerifier.verify(token);
        return payload?.sub || null;
      } catch (_) {}
    }
    // As a last resort, decode without verification to extract sub (guarded by iss check)
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(b64, 'base64').toString('utf8');
        const payload = JSON.parse(json);
        const sub = payload?.sub || null;
        const iss = payload?.iss || '';
        if (sub && USER_POOL_ID && iss.includes(USER_POOL_ID)) {
          return sub;
        }
      }
    } catch (_) {}
    return null;
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  const method = event.requestContext?.http?.method;

  // Handle OPTIONS request (CORS preflight)
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    // Try to get userId from authorizer; if no authorizer on route, verify JWT header; fallback to body.userId
    let userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    const body = JSON.parse(event.body || '{}');
    if (!userId) {
      userId = await extractUserIdFromAuthHeader(event.headers);
    }
    if (!userId && body.userId) {
      userId = body.userId;
    }
    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized: No userId provided' })
      };
    }
    console.log('User ID from authorizer:', userId);

    // Parse request body
    const { is_premium_member, is_verified, deviceToken, platform } = body;

    // Validate input
    if (is_premium_member === undefined && is_verified === undefined && !deviceToken) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Provide is_premium_member, is_verified, or deviceToken' })
      };
    }

    // Build update query
    let updateFields = [];
    let params = [];
    if (is_premium_member !== undefined) {
      updateFields.push(`is_premium_member = $${updateFields.length + 1}`);
      params.push(is_premium_member);
      
      // If setting premium to true, also set premium_start_date
      if (is_premium_member === true) {
        updateFields.push(`premium_start_date = NOW()`);
      } else if (is_premium_member === false) {
        updateFields.push(`premium_start_date = NULL`);
      }
    }
    if (is_verified !== undefined) {
      updateFields.push(`is_verified = $${updateFields.length + 1}`);
      params.push(is_verified);
    }
    // Optionally update device token and platform if provided
    if (deviceToken) {
      let endpointArnToStore = deviceToken;
      try {
        // If not already an ARN, create/find SNS endpoint
        if (!/^arn:aws:sns:[^:]+:[0-9]+:endpoint\//.test(deviceToken)) {
          const AWS = require('aws-sdk');
          const sns = new AWS.SNS({ region: process.env.REGION || process.env.AWS_REGION || 'us-east-1' });

          // Determine platform application ARN
          let platformApplicationArn = null;
          if ((platform || '').toLowerCase() === 'ios') {
            // Prefer explicit prod ARN; fallback to sandbox if provided
            platformApplicationArn = process.env.SNS_APNS_PLATFORM_ARN || process.env.SNS_APNS_SANDBOX_PLATFORM_ARN;
          } else if ((platform || '').toLowerCase() === 'android') {
            platformApplicationArn = process.env.SNS_FCM_PLATFORM_ARN || process.env.SNS_GCM_PLATFORM_ARN;
          }

          if (platformApplicationArn) {
            try {
              console.log('Creating SNS endpoint for platform:', platform, 'appArn:', platformApplicationArn);
              const createRes = await withTimeout(sns.createPlatformEndpoint({
                PlatformApplicationArn: platformApplicationArn,
                Token: deviceToken,
                CustomUserData: userId
              }).promise(), 3000, 'sns.createPlatformEndpoint');
              endpointArnToStore = createRes.EndpointArn;
              // Ensure endpoint is enabled
              await withTimeout(sns.setEndpointAttributes({
                EndpointArn: endpointArnToStore,
                Attributes: { Token: deviceToken, Enabled: 'true' }
              }).promise(), 3000, 'sns.setEndpointAttributes');
            } catch (e) {
              // If endpoint exists, ARN is often included in the error message
              const msg = e && e.message ? String(e.message) : '';
              const match = msg.match(/Endpoint (arn:aws:sns[^ ]+)/);
              if (match && match[1]) {
                endpointArnToStore = match[1];
                try {
                  await withTimeout(sns.setEndpointAttributes({
                    EndpointArn: endpointArnToStore,
                    Attributes: { Token: deviceToken, Enabled: 'true' }
                  }).promise(), 3000, 'sns.setEndpointAttributes');
                } catch (e2) {
                  console.warn('Failed to set endpoint attributes:', e2.message);
                }
              } else {
                console.warn('createPlatformEndpoint failed:', msg);
              }
            }
          } else {
            console.warn('No SNS platform application ARN configured for platform:', platform);
          }
        }
      } catch (e) {
        console.warn('SNS endpoint setup error:', e.message);
      }
      // Only persist if we have a valid endpoint ARN
      if (/^arn:aws:sns:[^:]+:[0-9]+:endpoint\//.test(endpointArnToStore)) {
        updateFields.push(`push_token = $${updateFields.length + 1}`);
        params.push(endpointArnToStore);
      } else {
        console.warn('Skipping push_token persistence: endpoint ARN not available');
      }

      const platformValue = (platform === 'ios' || platform === 'android') ? platform : null;
      if (platformValue) {
        updateFields.push(`push_platform = $${updateFields.length + 1}`);
        params.push(platformValue);
      }
    }
    // Add user ID parameter
    params.push(userId);
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length}
    `;
    console.log('Update query:', updateQuery);
    console.log('Parameters:', JSON.stringify(params, null, 2));

    // Connect to PostgreSQL
    const client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const updateResult = await client.query(updateQuery, params);
    await client.end();
    console.log('Update result:', JSON.stringify(updateResult, null, 2));

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'User status updated successfully',
        userId: userId,
        updatedFields: {
          is_premium_member,
          is_verified
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 