const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'findplayer-messages';
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'findplayer-conversations';

const handler = async (event) => {
  console.log('markMessagesRead called with event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  try {
    // Get user ID from JWT claims - try multiple possible paths
    console.log('Full event structure:', JSON.stringify(event, null, 2));
    console.log('Request context:', JSON.stringify(event.requestContext, null, 2));
    console.log('Authorizer:', JSON.stringify(event.requestContext?.authorizer, null, 2));
    
    let userId = null;
    
    // Try different possible paths for user ID
    if (event.requestContext?.authorizer?.jwt?.claims?.sub) {
      userId = event.requestContext.authorizer.jwt.claims.sub;
      console.log('Found user ID from jwt.claims.sub:', userId);
    } else if (event.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
      console.log('Found user ID from claims.sub:', userId);
    } else if (event.requestContext?.authorizer?.jwt?.claims?.['cognito:username']) {
      userId = event.requestContext.authorizer.jwt.claims['cognito:username'];
      console.log('Found user ID from cognito:username:', userId);
    } else if (event.requestContext?.authorizer?.claims?.['cognito:username']) {
      userId = event.requestContext.authorizer.claims['cognito:username'];
      console.log('Found user ID from claims.cognito:username:', userId);
    }
    
    console.log('Final User ID:', userId);
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'Unauthorized: No user ID found in token.' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { conversationId } = body;
    console.log('Conversation ID:', conversationId);

    if (!conversationId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'conversationId is required' }),
      };
    }

    // Verify user is a participant in the conversation
    const conversationScanParams = {
      TableName: CONVERSATIONS_TABLE,
      FilterExpression: 'conversationId = :conversationId AND contains(participants, :userId)',
      ExpressionAttributeValues: {
        ':conversationId': conversationId,
        ':userId': userId
      },
    };

    const conversationResult = await docClient.send(new ScanCommand(conversationScanParams));
    if (!conversationResult.Items || conversationResult.Items.length === 0) {
      console.log('User is not a participant in the conversation.');
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({ message: 'You are not a participant in this conversation' }),
      };
    }

    // Find all unread messages in the conversation where the user is the receiver
    const messagesScanParams = {
      TableName: MESSAGES_TABLE,
      FilterExpression: 'conversationId = :conversationId AND receiverId = :receiverId AND isRead = :isRead',
      ExpressionAttributeValues: {
        ':conversationId': conversationId,
        ':receiverId': userId,
        ':isRead': false
      },
    };

    const messagesResult = await docClient.send(new ScanCommand(messagesScanParams));
    const unreadMessages = messagesResult.Items || [];
    console.log(`Found ${unreadMessages.length} unread messages to mark as read.`);

    // Mark each unread message as read
    const updatePromises = unreadMessages.map(message => {
      console.log('Updating message:', message.messageId);
      const updateParams = {
        TableName: MESSAGES_TABLE,
        Key: {
          conversationId: message.conversationId,
          messageId: message.messageId
        },
        UpdateExpression: 'SET isRead = :isRead, readAt = :readAt',
        ExpressionAttributeValues: {
          ':isRead': true,
          ':readAt': new Date().toISOString()
        }
      };
      return docClient.send(new UpdateCommand(updateParams));
    });

    await Promise.all(updatePromises);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Messages marked as read successfully',
        updatedCount: unreadMessages.length
      }),
    };
  } catch (err) {
    console.error('Error in markMessagesRead:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

module.exports = { handler }; 