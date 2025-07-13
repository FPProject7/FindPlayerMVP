import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

export const handler = async (event) => {
    const now = new Date().toISOString();
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        let senderId = claims['cognito:username'] || claims['sub'];
        let { receiverId, content, messageType = 'text' } = event.arguments.input;

        // Always resolve to UUID
        senderId = await resolveUserId(senderId);
        receiverId = await resolveUserId(receiverId);

        // Check premium status from DB
        const isPremium = await isUserPremium(senderId);

        // Deterministic conversationId for user pair
        const participants = [senderId, receiverId].sort();
        const conversationId = participants.join('_');
        let conversationTimestamp = now;
        let isNewConversation = false;

        console.log('[send-message] senderId:', senderId, 'receiverId:', receiverId, 'conversationId:', conversationId, 'isPremium:', isPremium);

        // Check if conversation already exists (use Scan due to sort key)
        const scanParams = {
            TableName: CONVERSATIONS_TABLE,
            FilterExpression: 'conversationId = :cid',
            ExpressionAttributeValues: { ':cid': conversationId },
            Limit: 1
        };
        const scanResult = await docClient.send(new ScanCommand(scanParams));
        console.log('[send-message] scanResult.Items.length:', scanResult.Items ? scanResult.Items.length : 0);
        if (!scanResult.Items || scanResult.Items.length === 0) {
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
            await docClient.send(new PutCommand({
                TableName: CONVERSATIONS_TABLE,
                Item: newConversation
            }));
        } else {
            // Use the existing conversation timestamp for updates
            conversationTimestamp = scanResult.Items[0].timestamp;
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
        await docClient.send(new UpdateCommand(updateConversationParams));

        return {
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
    } catch (error) {
        console.error('Error in sendMessage:', error);
        throw new Error(error.message || 'Internal server error');
    }
}; 