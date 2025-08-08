// Delete My Account Lambda
// - Deletes user data from Postgres (RDS), DynamoDB messaging/registrations, and Cognito user
// - Assumes API Gateway HTTP API with JWT authorizer; reads userId from claims.sub

const { Client } = require('pg');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand, BatchWriteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const jwt = require('jsonwebtoken');

// CORS headers for Lambda Proxy Integration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// DynamoDB DocumentClient (v3 SDK)
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);

// Cognito (v3 SDK)
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || process.env.REGION || 'us-east-1' });

// S3 Client (v3 SDK)
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Environment variables for DynamoDB tables
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'findplayer-conversations';
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'findplayer-messages';
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE || 'findplayer-event-registrations';
const REGISTRATIONS_USER_GSI = process.env.REGISTRATIONS_USER_GSI || 'userId-index';
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'findplayer-events';
const USER_CONVERSATIONS_TABLE = process.env.USER_CONVERSATIONS_TABLE || 'findplayer-user-conversations';

// Optional S3 cleanup (posts/* prefix)
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PROFILE_PICTURES_BUCKET = process.env.PROFILE_PICTURES_BUCKET || 'findplayermvp-profile-pictures';

exports.handler = async (event) => {
  console.log('=== DELETE ACCOUNT FUNCTION STARTED ===');
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({}) };
  }

  try {
    // Try to get userId from authorizer claims first (if authorizer is attached)
    let claims = event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims || {};
    let userId = claims.sub || claims['cognito:username'];
    
    // If no authorizer claims, try to decode JWT from Authorization header
    if (!userId && event.headers?.authorization) {
      try {
        console.log('Attempting to decode JWT from Authorization header');
        const token = event.headers.authorization.replace('Bearer ', '');
        console.log('Token extracted:', token.substring(0, 50) + '...');
        
        // Use jsonwebtoken library to decode JWT (without verification for now)
        let decoded = jwt.decode(token);
        console.log('JWT decoded successfully:', JSON.stringify(decoded, null, 2));
        
        // If jwt.decode returns null, try manual decoding of the payload
        if (!decoded) {
          console.log('JWT decode returned null, attempting manual payload extraction');
          const parts = token.split('.');
          if (parts.length >= 2) {
            try {
              // Try to decode the payload part manually
              const payloadBase64 = parts[1];
              const payloadString = Buffer.from(payloadBase64, 'base64').toString('utf8');
              console.log('Manual payload string:', payloadString);
              
              // Extract user ID using regex since JSON might be corrupted
              const subMatch = payloadString.match(/"sub"\s*:\s*"([^"]+)"/);
              if (subMatch) {
                userId = subMatch[1];
                console.log('Extracted userId from regex:', userId);
              } else {
                console.log('No sub field found in payload');
              }
            } catch (manualError) {
              console.error('Manual payload extraction failed:', manualError);
            }
          }
        } else {
          userId = decoded?.sub || decoded?.['cognito:username'];
          console.log('Extracted userId from decoded JWT:', userId);
        }
      } catch (jwtError) {
        console.error('Failed to decode JWT:', jwtError);
      }
    }
    
    if (!userId) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized - No valid user ID found' }) };
    }

    // Parse body for extra confirmation (optional)
    const body = JSON.parse(event.body || '{}');
    if (body?.confirm !== true) {
      // Soft check to avoid accidental calls without explicit confirmation flag
      // Frontend should send { confirm: true }
    }

    // 1) Delete relational data in Postgres within a transaction
    await deleteFromPostgres(userId);

    // 2) Delete messaging and event registration data in DynamoDB (best-effort, non-fatal if fails)
    await Promise.allSettled([
      deleteFromDynamoConversationsAndMessages(userId),
      deleteFromDynamoRegistrations(userId),
      deleteFromDynamoEvents(userId),
      deleteFromDynamoUserConversations(userId),
      deleteS3PostsPrefix(userId),
      deleteS3ProfilePicture(userId),
    ]);

    // 3) Delete user in Cognito (admin)
    await deleteFromCognito(userId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Delete account failed:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to delete account', details: error.message })
    };
  }
};

async function deleteFromPostgres(userId) {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    await client.query('BEGIN');

    // Delete order considers FKs and dependencies; adjust if DB has ON DELETE CASCADE
    // Messaging is in DynamoDB, so not here

    // Posts: likes, comments, notifications referencing posts
    await client.query('DELETE FROM post_likes WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM post_comments WHERE user_id = $1', [userId]);

    // Followers
    await client.query('DELETE FROM followers WHERE follower_id = $1 OR following_id = $1', [userId]);

    // Notifications involving the user
    await client.query('DELETE FROM notifications WHERE from_user_id = $1 OR to_user_id = $1', [userId]);

    // Challenges-related (delete in correct order to respect FK constraints)
    await client.query('DELETE FROM user_completed_challenges WHERE user_id = $1', [userId]);
    
    // Delete user_experience_points that reference challenge_submissions by this user
    await client.query(`
      DELETE FROM user_experience_points 
      WHERE submission_id IN (
        SELECT id FROM challenge_submissions WHERE athlete_id = $1
      )
    `, [userId]);
    
    // Now safe to delete challenge_submissions
    await client.query('DELETE FROM challenge_submissions WHERE athlete_id = $1', [userId]);
    await client.query('DELETE FROM challenges WHERE coach_id = $1', [userId]);

    // Starred players (scout relations)
    await client.query('DELETE FROM starred_players WHERE scout_id = $1 OR athlete_id = $1', [userId]);

    // Finally, posts the user authored
    await client.query('DELETE FROM posts WHERE user_id = $1', [userId]);

    // Finally, remove the user row
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

async function deleteFromDynamoRegistrations(userId) {
      try {
      // Query registrations by userId via GSI
      const res = await dynamoDb.send(new QueryCommand({
        TableName: REGISTRATIONS_TABLE,
        IndexName: REGISTRATIONS_USER_GSI,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }));
    const items = res.Items || [];
    if (items.length === 0) return;

    const deletes = items.map((it) => ({
      DeleteRequest: { Key: { registrationId: it.registrationId } }
    }));

    // BatchWrite in chunks of 25
    for (let i = 0; i < deletes.length; i += 25) {
      const chunk = deletes.slice(i, i + 25);
      await dynamoDb.send(new BatchWriteCommand({ RequestItems: { [REGISTRATIONS_TABLE]: chunk } }));
    }
  } catch (e) {
    console.error('Failed to delete DynamoDB registrations:', e);
  }
}

async function deleteFromDynamoEvents(userId) {
  try {
    console.log(`Starting DynamoDB events deletion for user: ${userId}`);
    
    // Get user's email from PostgreSQL to search for events with email addresses
    let userEmail = null;
    try {
      const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      const result = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      await client.end();
      if (result.rows.length > 0) {
        userEmail = result.rows[0].email;
        console.log(`Found user email for events search: ${userEmail}`);
      }
    } catch (emailError) {
      console.log('Could not fetch user email for events search:', emailError.message);
    }
    
    // Comprehensive search for events using multiple identifiers
    const searchIdentifiers = [userId]; // Start with UUID
    if (userEmail) {
      searchIdentifiers.push(userEmail);
    }
    
    console.log('Searching for events with identifiers:', searchIdentifiers);
    
    // Find all events hosted by the user using comprehensive search
    let allEvents = [];
    let lastEvaluatedKey = undefined;
    
    do {
      const scanParams = {
        TableName: EVENTS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
      };
      
      const response = await dynamoDb.send(new ScanCommand(scanParams));
      console.log(`Scanned ${response.Items?.length || 0} events in this batch`);
      
      // Filter events where any search identifier matches hostUserId
      const matchingEvents = (response.Items || []).filter(event => {
        if (!event.hostUserId) return false;
        return searchIdentifiers.some(identifier => 
          event.hostUserId === identifier
        );
      });
      
      console.log(`Found ${matchingEvents.length} matching events in this batch`);
      allEvents = allEvents.concat(matchingEvents);
      
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Found ${allEvents.length} DynamoDB events to delete total`);

    // Delete each event
    for (const event of allEvents) {
      const eventId = event.eventId;
      if (!eventId) continue;

      console.log(`Deleting DynamoDB event: ${eventId}`);
      await dynamoDb.send(new DeleteCommand({ 
        TableName: EVENTS_TABLE, 
        Key: { eventId } 
      }));
      console.log(`Deleted DynamoDB event: ${eventId}`);
    }

    console.log(`Successfully deleted ${allEvents.length} DynamoDB events for user: ${userId}`);
  } catch (e) {
    console.error('Failed to delete DynamoDB events:', e);
    throw e; // Re-throw to ensure the deletion process fails if this step fails
  }
}

async function deleteFromDynamoConversationsAndMessages(userId) {
  try {
    console.log(`Starting conversation and message deletion for user: ${userId}`);
    
    // Get user's email from PostgreSQL to search for conversations with email addresses
    let userEmail = null;
    try {
      const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      const result = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      await client.end();
      if (result.rows.length > 0) {
        userEmail = result.rows[0].email;
        console.log(`Found user email for conversations search: ${userEmail}`);
      }
    } catch (emailError) {
      console.log('Could not fetch user email for conversations search:', emailError.message);
    }
    
    // Comprehensive search for conversations using multiple identifiers
    const searchIdentifiers = [userId]; // Start with UUID
    if (userEmail) {
      searchIdentifiers.push(userEmail);
    }
    
    console.log('Searching for conversations with identifiers:', searchIdentifiers);
    
    // Step 1: Find all conversations where the user is a participant using comprehensive search
    let allConversations = [];
    let lastEvaluatedKey = undefined;
    
    do {
      const scanParams = {
        TableName: CONVERSATIONS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
      };
      
      const response = await dynamoDb.send(new ScanCommand(scanParams));
      console.log(`Scanned ${response.Items?.length || 0} conversations in this batch`);
      
      // Filter conversations where any search identifier matches any participant
      const matchingConversations = (response.Items || []).filter(conversation => {
        if (!conversation.participants || !Array.isArray(conversation.participants)) {
          return false;
        }
        return searchIdentifiers.some(identifier => 
          conversation.participants.includes(identifier)
        );
      });
      
      console.log(`Found ${matchingConversations.length} matching conversations in this batch`);
      allConversations = allConversations.concat(matchingConversations);
      
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Found ${allConversations.length} conversations to delete total`);

    for (const conv of allConversations) {
      const conversationId = conv.conversationId;
      if (!conversationId) continue;

      console.log(`Processing conversation: ${conversationId}`);

      // Step 2: Delete ALL messages in this conversation (not just user's messages)
      // This ensures complete conversation removal for both participants
      let messagesLastKey = undefined;
      let totalMessagesDeleted = 0;
      do {
        const scanMsg = {
          TableName: MESSAGES_TABLE,
          FilterExpression: 'conversationId = :cid',
          ExpressionAttributeValues: { ':cid': conversationId },
          ExclusiveStartKey: messagesLastKey,
        };
        const msgResp = await dynamoDb.send(new ScanCommand(scanMsg));
        const msgs = msgResp.Items || [];
        
        if (msgs.length > 0) {
          console.log(`Deleting ${msgs.length} messages from conversation ${conversationId}`);
          const deletes = msgs.map(m => ({ DeleteRequest: { Key: { messageId: m.messageId } } }));
          
          // Process in batches of 25 (DynamoDB limit)
          for (let i = 0; i < deletes.length; i += 25) {
            const chunk = deletes.slice(i, i + 25);
            await dynamoDb.send(new BatchWriteCommand({ RequestItems: { [MESSAGES_TABLE]: chunk } }));
          }
          totalMessagesDeleted += msgs.length;
        }
        messagesLastKey = msgResp.LastEvaluatedKey;
      } while (messagesLastKey);

      console.log(`Deleted ${totalMessagesDeleted} messages from conversation ${conversationId}`);

      // Step 3: Delete the conversation itself
      await dynamoDb.send(new DeleteCommand({ 
        TableName: CONVERSATIONS_TABLE, 
        Key: { conversationId } 
      }));
      console.log(`Deleted conversation: ${conversationId}`);
    }

    console.log(`Successfully deleted ${allConversations.length} conversations and all associated messages for user: ${userId}`);
  } catch (e) {
    console.error('Failed to delete DynamoDB conversations/messages:', e);
    throw e; // Re-throw to ensure the deletion process fails if this step fails
  }
}

async function deleteFromDynamoUserConversations(userId) {
  try {
    console.log(`Starting user-conversations deletion for user: ${userId}`);
    
    // Get user's email from PostgreSQL to search for user-conversations with email addresses
    let userEmail = null;
    try {
      const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      const result = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      await client.end();
      if (result.rows.length > 0) {
        userEmail = result.rows[0].email;
        console.log(`Found user email for user-conversations search: ${userEmail}`);
      }
    } catch (emailError) {
      console.log('Could not fetch user email for user-conversations search:', emailError.message);
    }
    
    // Comprehensive search for user-conversations using multiple identifiers
    const searchIdentifiers = [userId]; // Start with UUID
    if (userEmail) {
      searchIdentifiers.push(userEmail);
    }
    
    console.log('Searching for user-conversations with identifiers:', searchIdentifiers);
    
    // Find all user-conversations where the user is involved using comprehensive search
    let allUserConversations = [];
    let lastEvaluatedKey = undefined;
    
    do {
      const scanParams = {
        TableName: USER_CONVERSATIONS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
      };
      
      const response = await dynamoDb.send(new ScanCommand(scanParams));
      console.log(`Scanned ${response.Items?.length || 0} user-conversations in this batch`);
      
      // Filter user-conversations where any search identifier matches the userId field
      const matchingUserConversations = (response.Items || []).filter(userConv => {
        if (!userConv.userId) return false;
        return searchIdentifiers.some(identifier => 
          userConv.userId === identifier
        );
      });
      
      console.log(`Found ${matchingUserConversations.length} matching user-conversations in this batch`);
      allUserConversations = allUserConversations.concat(matchingUserConversations);
      
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Found ${allUserConversations.length} user-conversations to delete total`);

    // Delete each user-conversation
    for (const userConv of allUserConversations) {
      const conversationId = userConv.conversationId;
      if (!conversationId) continue;

      console.log(`Deleting user-conversation: ${conversationId}`);
      await dynamoDb.send(new DeleteCommand({ 
        TableName: USER_CONVERSATIONS_TABLE, 
        Key: { conversationId } 
      }));
      console.log(`Deleted user-conversation: ${conversationId}`);
    }

    console.log(`Successfully deleted ${allUserConversations.length} user-conversations for user: ${userId}`);
  } catch (e) {
    console.error('Failed to delete DynamoDB user-conversations:', e);
    // Don't throw here as this table might not exist or be used
  }
}

async function deleteS3PostsPrefix(userId) {
  if (!S3_BUCKET_NAME) return;
  try {
    // Delete objects under posts/{userId}/ prefix
    const prefix = `posts/${userId}/`;
    let continuationToken = undefined;
    do {
      const listResp = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET_NAME, Prefix: prefix, ContinuationToken: continuationToken }));
      const objects = (listResp.Contents || []).map(o => ({ Key: o.Key }));
      if (objects.length > 0) {
        await s3.send(new DeleteObjectsCommand({ Bucket: S3_BUCKET_NAME, Delete: { Objects: objects } }));
      }
      continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (e) {
    console.error('Failed to delete S3 post objects:', e);
  }
}

async function deleteS3ProfilePicture(userId) {
  try {
    // Get user's email from PostgreSQL to find profile picture
    let userEmail = null;
    try {
      const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      const result = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      await client.end();
      if (result.rows.length > 0) {
        userEmail = result.rows[0].email;
        console.log(`Found user email for profile picture search: ${userEmail}`);
      }
    } catch (emailError) {
      console.log('Could not fetch user email for profile picture search:', emailError.message);
      return;
    }
    
    if (!userEmail) {
      console.log('No email found for user, skipping profile picture deletion');
      return;
    }
    
    // Search for profile pictures with the user's email
    const prefix = `profile-pictures/${userEmail.replace('@', '_').replace('.', '_')}`;
    console.log(`Searching for profile pictures with prefix: ${prefix}`);
    
    let continuationToken = undefined;
    do {
      const listResp = await s3.send(new ListObjectsV2Command({ 
        Bucket: PROFILE_PICTURES_BUCKET, 
        Prefix: prefix, 
        ContinuationToken: continuationToken 
      }));
      const objects = (listResp.Contents || []).map(o => ({ Key: o.Key }));
      if (objects.length > 0) {
        console.log(`Deleting ${objects.length} profile picture objects`);
        await s3.send(new DeleteObjectsCommand({ 
          Bucket: PROFILE_PICTURES_BUCKET, 
          Delete: { Objects: objects } 
        }));
      }
      continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined;
    } while (continuationToken);
    
    console.log(`Successfully deleted profile pictures for user: ${userId}`);
  } catch (e) {
    console.error('Failed to delete S3 profile picture objects:', e);
  }
}

async function deleteFromCognito(userId) {
  const USER_POOL_ID = process.env.USER_POOL_ID;
  if (!USER_POOL_ID) {
    console.warn('USER_POOL_ID not provided; skipping Cognito user deletion');
    return;
  }
  const cmd = new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: userId });
  await cognito.send(cmd);
}