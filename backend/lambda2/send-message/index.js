import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

export const handler = async (event) => {
    const now = new Date().toISOString();
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        const cognitoUsername = claims['cognito:username'];

        // UUID validation helper
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        // Check if user is premium
        const isPremium = claims['custom:is_premium_member'] === 'true';
        if (!isPremium) {
            throw new Error('Only premium members can use messaging.');
        }

        // Extract input parameters
        const { receiverId, content, messageType = 'text' } = event.arguments.input;
        console.log('[sendMessage] senderId:', cognitoUsername, 'receiverId:', receiverId);
        if (!receiverId || !content) {
            throw new Error('receiverId and content are required');
        }
        if (receiverId === 'new' || receiverId === cognitoUsername) {
            console.error('[sendMessage] Invalid receiverId:', receiverId, 'sender:', cognitoUsername);
            throw new Error('Invalid receiverId: cannot be "new" or the same as sender.');
        }

        // Deterministic conversationId for user pair (trim and lowercase for safety)
        const senderIdClean = cognitoUsername.trim().toLowerCase();
        const receiverIdClean = receiverId.trim().toLowerCase();
        const participants = [senderIdClean, receiverIdClean].sort();
        const conversationId = participants.join('_');
        console.log('[sendMessage] Final conversationId:', conversationId, 'Participants:', participants);
        let conversationTimestamp = now;
        let isNewConversation = false;

        // Check if conversation already exists (use Scan due to sort key)
        const scanParams = {
            TableName: CONVERSATIONS_TABLE,
            FilterExpression: 'conversationId = :cid',
            ExpressionAttributeValues: { ':cid': conversationId },
            Limit: 1
        };
        const scanResult = await docClient.send(new ScanCommand(scanParams));
        if (!scanResult.Items || scanResult.Items.length === 0) {
            // Create new conversation
            isNewConversation = true;
            const newConversation = {
                conversationId: conversationId,
                timestamp: now,
                participants: participants,
                createdAt: now,
                lastMessage: content,
                lastMessageTime: now,
                lastMessageSender: cognitoUsername
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
            senderId: cognitoUsername,
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
                ':lastMessageSender': cognitoUsername
            }
        };
        await docClient.send(new UpdateCommand(updateConversationParams));

        return {
            message: {
                messageId: messageId,
                conversationId: conversationId,
                senderId: cognitoUsername,
                receiverId: receiverId,
                content: content,
                timestamp: timestamp,
                readStatus: 'SENT' // New messages start as SENT (unread)
            },
            userConversation: {
                userId: cognitoUsername,
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