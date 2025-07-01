// *** LATEST CODE DEPLOYED: 2024-07-01  
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('*** LATEST CODE DEPLOYED: 2024-07-01 ***');
    console.log('Event:', JSON.stringify(event, null, 2));
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        const cognitoUsername = claims['cognito:username'];
        console.log('Cognito Username:', cognitoUsername);
        console.log('Claims:', JSON.stringify(claims, null, 2));

        // Trust the JWT claim for premium membership
        const isPremium = claims['custom:is_premium_member'] === 'true';
        if (!isPremium) {
            throw new Error('Only premium members can use messaging.');
        }

        // For now, return empty conversations
        console.log('Returning empty conversations list');
        return {
            items: [],
            nextToken: null
        };
    } catch (error) {
        console.error('Error:', error);
        throw new Error(error.message || 'Internal server error');
    }
}; 