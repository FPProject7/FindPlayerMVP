import AWS from 'aws-sdk';
import pkg from 'pg';
const { Client } = pkg;

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

// Utility: resolveUserId (returns UUID if already UUID, else looks up by email)
async function resolveUserId(identifier) {
  if (/^[0-9a-fA-F-]{36}$/.test(identifier)) return identifier;
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [identifier]);
  await client.end();
  if (res.rows.length === 0) throw new Error(`User not found for identifier: ${identifier}`);
  return res.rows[0].id;
}

// Utility: check if user is premium
async function isUserPremium(userId) {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query('SELECT is_premium_member FROM users WHERE id = $1 LIMIT 1', [userId]);
  await client.end();
  return res.rows.length > 0 && res.rows[0].is_premium_member === true;
}

export const handler = async (event) => {
  try {
    const claims = event.identity.claims;
    let userId = claims['cognito:username'] || claims['sub'];
    let { otherUserId } = event.arguments;

    // Always resolve to UUID
    userId = await resolveUserId(userId);
    otherUserId = await resolveUserId(otherUserId);

    // Check premium status from DB
    const isPremium = await isUserPremium(userId);
    if (!isPremium) {
      throw new Error('Only premium members can initiate new conversations. Free users can respond to existing conversations.');
    }

    if (!otherUserId || otherUserId === userId) {
      throw new Error('Invalid otherUserId');
    }

    // Use deterministic conversationId (same pattern as send-message Lambda)
    const participants = [userId, otherUserId].sort();
    const conversationId = participants.join('_');
    const now = new Date().toISOString();

    // Check if conversation already exists using the deterministic ID
    const scanParams = {
      TableName: CONVERSATIONS_TABLE,
      FilterExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId },
      Limit: 1
    };
    const existing = await dynamodb.scan(scanParams).promise();
    if (existing.Items && existing.Items.length > 0) {
      return existing.Items[0];
    }

    // Create new conversation with consistent structure
    const newConversation = {
      conversationId: conversationId,
      timestamp: now,
      participants: participants,
      createdAt: now,
      lastMessage: '',
      lastMessageTime: null,
      lastMessageSender: null
    };
    await dynamodb.put({ TableName: CONVERSATIONS_TABLE, Item: newConversation }).promise();
    return newConversation;
  } catch (err) {
    throw new Error(err.message || 'Failed to create conversation');
  }
}; 