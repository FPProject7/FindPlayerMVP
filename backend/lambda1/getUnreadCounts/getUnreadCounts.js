const { Client } = require('pg');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE || 'findplayer-conversations';
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'findplayer-messages';

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({ message: 'Unauthorized: No user ID found in token.' }),
      };
    }

    // Get unread notification count from PostgreSQL
    let unreadNotificationCount = 0;
    try {
      const pgClient = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
      });

      await pgClient.connect();
      
      const notificationResult = await pgClient.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE to_user_id = $1 AND is_read = false`,
        [userId]
      );
      
      unreadNotificationCount = parseInt(notificationResult.rows[0].count);
      await pgClient.end();
    } catch (pgError) {
      console.error('PostgreSQL error:', pgError);
      // Continue with DynamoDB query even if PostgreSQL fails
    }

    // Get unread message count from DynamoDB
    let unreadMessageCount = 0;
    try {
      console.log('Getting unread messages for user:', userId);
      // First, get all conversations where user is a participant
      const scanParams = {
        TableName: CONVERSATIONS_TABLE,
        FilterExpression: 'contains(participants, :userId)',
        ExpressionAttributeValues: { ':userId': userId },
      };
      
      const conversationsResult = await docClient.send(new ScanCommand(scanParams));
      const conversations = conversationsResult.Items || [];
      console.log('Found conversations:', conversations.length);
      
      // For each conversation, count unread messages where user is the receiver
      for (const conversation of conversations) {
        const messagesScanParams = {
          TableName: MESSAGES_TABLE,
          FilterExpression: 'conversationId = :conversationId AND receiverId = :receiverId AND isRead = :isRead',
          ExpressionAttributeValues: {
            ':conversationId': conversation.conversationId,
            ':receiverId': userId,
            ':isRead': false
          },
        };
        
        const messagesResult = await docClient.send(new ScanCommand(messagesScanParams));
        const unreadInConversation = messagesResult.Items ? messagesResult.Items.length : 0;
        unreadMessageCount += unreadInConversation;
        console.log(`Conversation ${conversation.conversationId}: ${unreadInConversation} unread messages`);
      }
      console.log('Total unread messages:', unreadMessageCount);
    } catch (dynamoError) {
      console.error('DynamoDB error:', dynamoError);
      // Continue even if DynamoDB fails
    }

    console.log('Final response:', { unreadNotificationCount, unreadMessageCount });
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        unreadNotificationCount,
        unreadMessageCount
      }),
    };
  } catch (err) {
    console.error('Error in getUnreadCounts:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}; 