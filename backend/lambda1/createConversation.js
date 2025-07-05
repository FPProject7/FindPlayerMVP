const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

exports.handler = async (event) => {
  try {
    const claims = event.identity.claims;
    const userId = claims['cognito:username'];
    const userName = claims['name'] || '';
    const { otherUserId } = event.arguments;

    if (!otherUserId || otherUserId === userId) {
      throw new Error('Invalid otherUserId');
    }

    // Check if conversation already exists (order-agnostic)
    const params = {
      TableName: CONVERSATIONS_TABLE,
      FilterExpression: '(participant1 = :u1 AND participant2 = :u2) OR (participant1 = :u2 AND participant2 = :u1)',
      ExpressionAttributeValues: {
        ':u1': userId,
        ':u2': otherUserId,
      },
    };
    const existing = await dynamodb.scan(params).promise();
    if (existing.Items && existing.Items.length > 0) {
      return existing.Items[0];
    }

    // Create new conversation
    const now = new Date().toISOString();
    const conversationId = `${userId}_${otherUserId}_${Date.now()}`;
    const newConversation = {
      conversationId,
      participant1: userId,
      participant2: otherUserId,
      participant1Name: userName,
      participant2Name: '', // Optionally fetch from DB
      lastMessageContent: '',
      lastMessageTimestamp: null,
      lastMessageSenderId: null,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await dynamodb.put({ TableName: CONVERSATIONS_TABLE, Item: newConversation }).promise();
    return newConversation;
  } catch (err) {
    throw new Error(err.message || 'Failed to create conversation');
  }
}; 