const AWS = require('aws-sdk');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        const cognitoUsername = claims['cognito:username'];
        
        console.log('Cognito Username:', cognitoUsername);
        console.log('Claims:', JSON.stringify(claims, null, 2));
        
        // Check if user is premium
        const isPremium = claims['custom:is_premium_member'] === 'true';
        if (!isPremium) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'Premium membership required to send messages'
                })
            };
        }
        
        // Verify user exists in Cognito and get their attributes
        let userAttributes;
        try {
            const cognitoResponse = await cognitoIdentityServiceProvider.adminGetUser({
                UserPoolId: process.env.USER_POOL_ID,
                Username: cognitoUsername
            }).promise();
            
            userAttributes = cognitoResponse.UserAttributes;
            console.log('Cognito user found:', cognitoResponse.Username);
        } catch (cognitoError) {
            console.error('Cognito lookup failed:', cognitoError);
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: 'User not found in Cognito'
                })
            };
        }
        
        // Extract input parameters
        const { conversationId, content, messageType = 'text' } = event.arguments;
        
        if (!conversationId || !content) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'conversationId and content are required'
                })
            };
        }
        
        // Check if conversation exists and user is a participant
        const conversationParams = {
            TableName: process.env.CONVERSATIONS_TABLE,
            Key: {
                id: conversationId
            }
        };
        
        const conversationResult = await dynamodb.get(conversationParams).promise();
        if (!conversationResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: 'Conversation not found'
                })
            };
        }
        
        // Check if user is a participant in this conversation
        const isParticipant = conversationResult.Item.participants.includes(cognitoUsername);
        if (!isParticipant) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'You are not a participant in this conversation'
                })
            };
        }
        
        // Create message
        const messageId = `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        const message = {
            id: messageId,
            conversationId: conversationId,
            senderId: cognitoUsername,
            content: content,
            messageType: messageType,
            timestamp: timestamp,
            isRead: false
        };
        
        // Save message to DynamoDB
        const messageParams = {
            TableName: process.env.MESSAGES_TABLE,
            Item: message
        };
        
        await dynamodb.put(messageParams).promise();
        
        // Update conversation's lastMessage and lastMessageTime
        const updateConversationParams = {
            TableName: process.env.CONVERSATIONS_TABLE,
            Key: {
                id: conversationId
            },
            UpdateExpression: 'SET lastMessage = :lastMessage, lastMessageTime = :lastMessageTime',
            ExpressionAttributeValues: {
                ':lastMessage': content,
                ':lastMessageTime': timestamp
            }
        };
        
        await dynamodb.update(updateConversationParams).promise();
        
        console.log('Message sent successfully:', messageId);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                id: messageId,
                conversationId: conversationId,
                senderId: cognitoUsername,
                content: content,
                messageType: messageType,
                timestamp: timestamp,
                isRead: false
            })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error'
            })
        };
    }
}; 