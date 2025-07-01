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
                    error: 'Premium membership required to view messages'
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
        const { conversationId, limit = 50, nextToken } = event.arguments;
        
        if (!conversationId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'conversationId is required'
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
        
        // Query messages for this conversation
        const queryParams = {
            TableName: process.env.MESSAGES_TABLE,
            IndexName: 'conversation-timestamp-index',
            KeyConditionExpression: 'conversationId = :conversationId',
            ExpressionAttributeValues: {
                ':conversationId': conversationId
            },
            ScanIndexForward: false, // Most recent first
            Limit: limit
        };
        
        if (nextToken) {
            queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
        }
        
        const result = await dynamodb.query(queryParams).promise();
        
        // Mark messages as read for the current user
        const unreadMessages = result.Items.filter(message => 
            !message.isRead && message.senderId !== cognitoUsername
        );
        
        if (unreadMessages.length > 0) {
            const updatePromises = unreadMessages.map(message => {
                const updateParams = {
                    TableName: process.env.MESSAGES_TABLE,
                    Key: {
                        id: message.id
                    },
                    UpdateExpression: 'SET isRead = :isRead',
                    ExpressionAttributeValues: {
                        ':isRead': true
                    }
                };
                return dynamodb.update(updateParams).promise();
            });
            
            await Promise.all(updatePromises);
        }
        
        // Transform messages to match GraphQL schema
        const messages = result.Items.map(message => ({
            messageId: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            receiverId: message.receiverId || '',
            content: message.content,
            timestamp: message.timestamp,
            readStatus: message.isRead ? 'READ' : 'SENT',
            senderName: message.senderName,
            receiverName: message.receiverName
        }));
        
        console.log('Messages retrieved successfully');
        
        // Return in the format expected by GraphQL schema
        return {
            statusCode: 200,
            body: JSON.stringify({
                items: messages,
                nextToken: result.LastEvaluatedKey ? 
                    Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null
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