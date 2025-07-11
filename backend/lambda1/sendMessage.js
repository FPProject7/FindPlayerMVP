import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

export const handler = async (event) => {
    const now = new Date().toISOString();
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        console.log('JWT claims:', JSON.stringify(claims, null, 2));
        const cognitoUsername = claims['cognito:username'] || claims['sub'];

        // Extract input parameters
        const { receiverId, content, conversationId, messageType = 'text' } = event.arguments.input;

        if (!receiverId || !content) {
            throw new Error('receiverId and content are required');
        }

        let finalConversationId = conversationId;
        let conversationTimestamp;

        // If no conversationId provided, check for existing conversation (order-agnostic)
        if (!finalConversationId) {
            // Scan for existing conversation with both participants
            const scanParams = {
                TableName: CONVERSATIONS_TABLE,
                FilterExpression: 'contains(participants, :u1) AND contains(participants, :u2)',
                ExpressionAttributeValues: {
                    ':u1': cognitoUsername,
                    ':u2': receiverId,
                },
            };
            const existing = await docClient.send(new ScanCommand(scanParams));
            if (existing.Items && existing.Items.length > 0) {
                finalConversationId = existing.Items[0].conversationId;
                conversationTimestamp = existing.Items[0].timestamp;
            } else {
                // No existing conversation, create new
                const now = new Date().toISOString();
                finalConversationId = `${cognitoUsername}_${receiverId}_${Date.now()}`;
                const newConversation = {
                    conversationId: finalConversationId,
                    timestamp: now,
                    participants: [cognitoUsername, receiverId],
                    createdAt: now,
                    lastMessage: content,
                    lastMessageTime: now,
                    lastMessageSender: cognitoUsername
                };
                await docClient.send(new PutCommand({
                    TableName: CONVERSATIONS_TABLE,
                    Item: newConversation
                }));
                conversationTimestamp = now;
            }
        } else {
            // Query for the latest conversation by conversationId to get the timestamp
            const queryParams = {
                TableName: CONVERSATIONS_TABLE,
                KeyConditionExpression: 'conversationId = :cid',
                ExpressionAttributeValues: { ':cid': finalConversationId },
                ScanIndexForward: false, // get latest
                Limit: 1
            };
            const queryResult = await docClient.send(new QueryCommand(queryParams));
            if (!queryResult.Items || queryResult.Items.length === 0) {
                throw new Error('Conversation not found');
            }
            const conversationItem = queryResult.Items[0];

            // Check if user is a participant in this conversation
            const isParticipant = conversationItem.participants.includes(cognitoUsername);
            if (!isParticipant) {
                throw new Error('You are not a participant in this conversation');
            }

            // Save timestamp for update
            conversationTimestamp = conversationItem.timestamp;
        }

        // Create message
        const messageId = `${finalConversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        const message = {
            conversationId: finalConversationId,
            messageId: messageId,
            senderId: cognitoUsername,
            receiverId: receiverId,
            content: content,
            messageType: messageType,
            timestamp: timestamp,
            isRead: false
        };

        // Save message to DynamoDB
        const messageParams = {
            TableName: MESSAGES_TABLE,
            Item: message
        };

        await docClient.send(new PutCommand(messageParams));

        // Update conversation's lastMessage and lastMessageTime
        const updateConversationParams = {
            TableName: CONVERSATIONS_TABLE,
            Key: { conversationId: finalConversationId, timestamp: conversationTimestamp || now },
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
                conversationId: finalConversationId,
                senderId: cognitoUsername,
                receiverId: receiverId,
                content: content,
                timestamp: timestamp,
                readStatus: 'SENT' // New messages start as SENT (unread)
            },
            userConversation: {
                userId: cognitoUsername,
                conversationId: finalConversationId,
                otherUserId: receiverId,
                lastMessageContent: content,
                lastMessageTimestamp: timestamp,
                unreadCount: 0
            }
        };

    } catch (error) {
        throw new Error(error.message || 'Internal server error');
    }
}; 