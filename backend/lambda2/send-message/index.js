import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import pkg from 'pg';
const { Client } = pkg;

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
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

// Helper: Check if conversation exists and get its details
async function findExistingConversation(conversationId) {
  try {
    // Try to query the conversation directly first
    const queryParams = {
      TableName: CONVERSATIONS_TABLE,
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId },
      Limit: 1
    };
    
    console.log('[findExistingConversation] Querying with params:', JSON.stringify(queryParams, null, 2));
    const queryResult = await docClient.send(new QueryCommand(queryParams));
    console.log('[findExistingConversation] Query result items:', queryResult.Items ? queryResult.Items.length : 0);
    
    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log('[findExistingConversation] Found conversation via query:', JSON.stringify(queryResult.Items[0], null, 2));
      return queryResult.Items[0];
    }
    
    // Fallback to scan if query doesn't work
    console.log('[findExistingConversation] Query returned no results, trying scan...');
    const scanParams = {
      TableName: CONVERSATIONS_TABLE,
      FilterExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': conversationId },
      Limit: 1
    };
    
    console.log('[findExistingConversation] Scanning with params:', JSON.stringify(scanParams, null, 2));
    const scanResult = await docClient.send(new ScanCommand(scanParams));
    console.log('[findExistingConversation] Scan result items:', scanResult.Items ? scanResult.Items.length : 0);
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log('[findExistingConversation] Found conversation via scan:', JSON.stringify(scanResult.Items[0], null, 2));
      return scanResult.Items[0];
    }
    
    console.log('[findExistingConversation] No conversation found');
    return null;
  } catch (error) {
    console.error('[findExistingConversation] Error finding conversation:', error);
    throw error;
  }
}

export const handler = async (event) => {
    const now = new Date().toISOString();
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        let senderId = claims['cognito:username'] || claims['sub'];
        let { receiverId, content, messageType = 'text' } = event.arguments.input;

        console.log('[send-message] Original senderId:', senderId, 'receiverId:', receiverId);

        // Always resolve to UUID
        senderId = await resolveUserId(senderId);
        receiverId = await resolveUserId(receiverId);

        console.log('[send-message] Resolved senderId:', senderId, 'receiverId:', receiverId);

        // Check premium status from DB
        const isPremium = await isUserPremium(senderId);
        console.log('[send-message] User premium status:', isPremium);

        // Deterministic conversationId for user pair
        const participants = [senderId, receiverId].sort();
        const conversationId = participants.join('_');
        let conversationTimestamp = now;
        let isNewConversation = false;

        console.log('[send-message] conversationId:', conversationId, 'participants:', participants);

        // Check if conversation already exists
        const existingConversation = await findExistingConversation(conversationId);
        
        if (!existingConversation) {
            // Only block non-premium users if they are initiating a new conversation (no previous messages)
            if (!isPremium) {
                console.log('[send-message] BLOCKED: Non-premium user trying to start new conversation');
                throw new Error('Only premium members can initiate new conversations. Free users can respond to existing conversations.');
            }
            // Create new conversation
            isNewConversation = true;
            const newConversation = {
                conversationId: conversationId,
                timestamp: now,
                participants: participants,
                createdAt: now,
                lastMessage: content,
                lastMessageTime: now,
                lastMessageSender: senderId
            };
            console.log('[send-message] Creating new conversation:', JSON.stringify(newConversation, null, 2));
            await docClient.send(new PutCommand({
                TableName: CONVERSATIONS_TABLE,
                Item: newConversation
            }));
        } else {
            // Use the existing conversation timestamp for updates
            conversationTimestamp = existingConversation.timestamp;
            console.log('[send-message] Using existing conversation timestamp:', conversationTimestamp);
        }

        // Create message
        const messageId = `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        const message = {
            conversationId: conversationId,
            messageId: messageId,
            senderId: senderId,
            receiverId: receiverId,
            content: content,
            messageType: messageType,
            timestamp: timestamp,
            isRead: false
        };
        
        console.log('[send-message] Creating message:', JSON.stringify(message, null, 2));
        await docClient.send(new PutCommand({
            TableName: MESSAGES_TABLE,
            Item: message
        }));

        // Update conversation's lastMessage and lastMessageTime
        const updateConversationParams = {
            TableName: CONVERSATIONS_TABLE,
            Key: { conversationId: conversationId, timestamp: conversationTimestamp },
            UpdateExpression: 'SET lastMessage = :lastMessage, lastMessageTime = :lastMessageTime, lastMessageSender = :lastMessageSender',
            ExpressionAttributeValues: {
                ':lastMessage': content,
                ':lastMessageTime': timestamp,
                ':lastMessageSender': senderId
            }
        };
        
        console.log('[send-message] Updating conversation with params:', JSON.stringify(updateConversationParams, null, 2));
        await docClient.send(new UpdateCommand(updateConversationParams));

        const result = {
            message: {
                messageId: messageId,
                conversationId: conversationId,
                senderId: senderId,
                receiverId: receiverId,
                content: content,
                timestamp: timestamp,
                readStatus: 'SENT' // New messages start as SENT (unread)
            },
            userConversation: {
                userId: senderId,
                conversationId: conversationId,
                otherUserId: receiverId,
                lastMessageContent: content,
                lastMessageTimestamp: timestamp,
                unreadCount: 0
            }
        };
        
        console.log('[send-message] Successfully sent message, returning result');
        return result;
    } catch (error) {
        console.error('Error in sendMessage:', error);
        throw new Error(error.message || 'Internal server error');
    }
}; 