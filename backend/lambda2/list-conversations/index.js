// *** LATEST CODE DEPLOYED: 2024-07-01  
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import pkg from 'pg';
const { Client } = pkg;

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

// Helper to fetch user info from RDS by userId
async function getUserInfo(userId) {
    let client;
    try {
        client = new Client({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false },
        });
        await client.connect();
        console.log('[getUserInfo] Querying userId:', userId);
        const result = await client.query(
            `SELECT id, name, profile_picture_url AS "profilePictureUrl" FROM users WHERE id = $1 LIMIT 1`,
            [userId]
        );
        console.log('[getUserInfo] SQL result:', JSON.stringify(result.rows));
        if (result.rowCount === 0) {
            // User not found in DB, fallback to placeholder
            return { name: `User ${userId.slice(0, 6)}`, profilePictureUrl: null };
        }
        return result.rows[0];
    } catch (error) {
        console.error('Database error in getUserInfo:', error);
        return { name: `User ${userId.slice(0, 6)}`, profilePictureUrl: null };
    } finally {
        if (client) {
            try {
                await client.end();
            } catch (endError) {
                console.error('Error closing database connection:', endError);
            }
        }
    }
}

export const handler = async (event) => {
    console.log('*** LATEST CODE DEPLOYED: 2024-07-01 ***');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    try {
        // Extract user info from JWT claims
        const claims = event.identity.claims;
        const cognitoUsername = claims['cognito:username'];
        console.log('Cognito Username:', cognitoUsername);
        console.log('Claims:', JSON.stringify(claims, null, 2));

        if (!cognitoUsername) {
            throw new Error('User not authenticated');
        }

        // Trust the JWT claim for premium membership
        const isPremium = claims['custom:is_premium_member'] === 'true';
        if (!isPremium) {
            throw new Error('Only premium members can use messaging.');
        }

        // Extract query parameters
        const { limit = 20, nextToken } = event.arguments || {};
        const validatedLimit = Math.min(Math.max(limit, 1), 50);

        // Scan conversations where the user is a participant
        const scanParams = {
            TableName: CONVERSATIONS_TABLE,
            FilterExpression: 'contains(participants, :userId)',
            ExpressionAttributeValues: { ':userId': cognitoUsername },
            Limit: validatedLimit,
        };

        if (nextToken) {
            try {
                scanParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
            } catch (tokenError) {
                console.error('Invalid nextToken:', tokenError);
                throw new Error('Invalid pagination token');
            }
        }

        console.log('Scanning conversations with params:', JSON.stringify(scanParams, null, 2));
        const response = await docClient.send(new ScanCommand(scanParams));
        
        console.log('Scan response:', JSON.stringify(response, null, 2));

        // Ensure we have items to process
        const items = response.Items || [];
        console.log(`Found ${items.length} conversations`);

        // For each conversation, fetch the other user's info
        const userConversations = await Promise.all(
            items.map(async (conversation) => {
                try {
                    // Ensure conversation has required fields
                    if (!conversation.conversationId || !conversation.participants) {
                        console.warn('Invalid conversation structure:', conversation);
                        return null;
                    }

                    // Robustly handle participants: always use array, always 2 users
                    const otherUserId = conversation.participants.find(p => p !== cognitoUsername);
                    if (!otherUserId) {
                        console.warn('No other participant found in conversation:', conversation);
                        return null;
                    }

                    // Always fetch user info, fallback to userId if not found
                    const userInfo = await getUserInfo(otherUserId);
                    
                    return {
                        userId: cognitoUsername,
                        conversationId: conversation.conversationId,
                        otherUserId: otherUserId,
                        otherUserName: userInfo.name || `User ${otherUserId.slice(0, 6)}`,
                        otherUserProfilePic: userInfo.profilePictureUrl || null,
                        lastMessageContent: conversation.lastMessage || null,
                        lastMessageTimestamp: conversation.lastMessageTime || null,
                        unreadCount: 0, // TODO: Implement unread count logic
                    };
                } catch (conversationError) {
                    console.error('Error processing conversation:', conversationError, conversation);
                    return null;
                }
            })
        );

        // Filter out null results and sort by last message timestamp (most recent first)
        const validConversations = userConversations
            .filter(conv => conv !== null)
            .sort((a, b) => {
                const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
                const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
                return timeB - timeA;
            });

        let nextTokenResult = null;
        if (response.LastEvaluatedKey) {
            nextTokenResult = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
        }

        const result = {
            items: validConversations,
            nextToken: nextTokenResult
        };
        
        console.log('Returning result:', JSON.stringify(result, null, 2));
        return result;
        
    } catch (error) {
        console.error('Error in listConversations handler:', error);
        
        // Return a valid structure even on error to prevent GraphQL null issues
        return {
            items: [],
            nextToken: null
        };
    }
}; 