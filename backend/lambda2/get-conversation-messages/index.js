import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

// Helper: Check if user is a participant in the conversation
async function isConversationParticipant(conversationId, userId) {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: CONVERSATIONS_TABLE,
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: { ':conversationId': conversationId },
      Limit: 1,
    }));
    
    if (!response.Items || response.Items.length === 0) {
      console.log('No conversation found with ID:', conversationId);
      return false;
    }
    
    const conversation = response.Items[0];
    console.log('Found conversation:', JSON.stringify(conversation, null, 2));
    console.log('Looking for user:', userId);
    console.log('Participants:', conversation.participants);
    
    // Check if user is in the participants array
    const isParticipant = conversation.participants && conversation.participants.includes(userId);
    console.log('Is participant:', isParticipant);
    
    return isParticipant;
  } catch (error) {
    console.error('Error checking conversation participation:', error);
    return false;
  }
}

export const handler = async (event) => {
  try {
    const claims = event.identity.claims;
    console.log('JWT claims:', JSON.stringify(claims, null, 2));
    
    // Use cognito:username to match sendMessage function
    const userId = claims['cognito:username'];
    console.log('User ID:', userId);
    
    const isPremium = claims['custom:is_premium_member'] === 'true';
    if (!isPremium) {
      throw new Error('Only premium members can use messaging.');
    }
    
    const { conversationId, limit = 20, nextToken } = event.arguments;
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }
    
    console.log('Looking for conversation:', conversationId);
    
    const validatedLimit = Math.min(Math.max(limit, 1), 50);
    const isParticipant = await isConversationParticipant(conversationId, userId);
    
    console.log('Is participant:', isParticipant);
    
    if (!isParticipant) {
      throw new Error('Access denied: You are not a participant in this conversation');
    }
    
    const queryParams = {
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: { ':conversationId': conversationId },
      ScanIndexForward: true,
      Limit: validatedLimit,
    };
    
    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }
    
    const response = await docClient.send(new QueryCommand(queryParams));
    const items = response.Items.map(item => ({
      messageId: item.messageId,
      conversationId: item.conversationId,
      senderId: item.senderId,
      receiverId: item.receiverId,
      content: item.content,
      timestamp: item.timestamp,
      senderName: item.senderName,
      receiverName: item.receiverName,
      readStatus: item.isRead === false ? 'SENT' : 'READ', // Map isRead boolean to MessageStatus enum
    }));
    
    let nextTokenResult = null;
    if (response.LastEvaluatedKey) {
      nextTokenResult = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
    }
    
    console.log(`Retrieved ${items.length} messages for conversation ${conversationId}`);
    return {
      items,
      nextToken: nextTokenResult,
    };
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    throw new Error(error.message || 'Failed to get conversation messages');
  }
}; 