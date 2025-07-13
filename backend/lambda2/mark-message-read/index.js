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
        
        // Remove premium check - allow all users to mark messages as read
        // Premium restrictions are handled at the conversation initiation level
        
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
        const { messageId } = event.arguments;
        
        if (!messageId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'messageId is required'
                })
            };
        }
        
        // Get the message to verify it exists and user is a participant
        const messageParams = {
            TableName: process.env.MESSAGES_TABLE,
            Key: {
                id: messageId
            }
        };
        
        const messageResult = await dynamodb.get(messageParams).promise();
        if (!messageResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: 'Message not found'
                })
            };
        }
        
        const message = messageResult.Item;
        
        // Check if user is a participant in the conversation
        const conversationParams = {
            TableName: process.env.CONVERSATIONS_TABLE,
            Key: {
                id: message.conversationId
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
        
        const isParticipant = conversationResult.Item.participants.includes(cognitoUsername);
        if (!isParticipant) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'You are not a participant in this conversation'
                })
            };
        }
        
        // Only allow marking messages as read if they were sent by someone else
        if (message.senderId === cognitoUsername) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Cannot mark your own messages as read'
                })
            };
        }
        
        // Mark message as read
        const updateParams = {
            TableName: process.env.MESSAGES_TABLE,
            Key: {
                id: messageId
            },
            UpdateExpression: 'SET isRead = :isRead',
            ExpressionAttributeValues: {
                ':isRead': true
            },
            ReturnValues: 'ALL_NEW'
        };
        
        const updateResult = await dynamodb.update(updateParams).promise();
        
        console.log('Message marked as read successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify(updateResult.Attributes)
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