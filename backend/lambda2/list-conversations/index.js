// *** LATEST CODE DEPLOYED: 2024-07-01  
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import pkg from 'pg';
const { Client } = pkg;

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'findplayer-messages';

// Utility: resolveUserId (returns UUID if already UUID, else looks up by email)
async function resolveUserId(identifier) {
  if (/^[0-9a-fA-F-]{36}$/.test(identifier)) return identifier;
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [identifier]);
  await client.end();
  if (res.rows.length === 0) throw new Error(`User not found for identifier: ${identifier}`);
  return res.rows[0].id;
}

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
        let cognitoUsername = claims['cognito:username'] || claims['sub'];
        console.log('Original Cognito Username:', cognitoUsername);
        console.log('Claims:', JSON.stringify(claims, null, 2));

        if (!cognitoUsername) {
            throw new Error('User not authenticated');
        }

        // Always resolve to UUID for consistency with send-message function
        cognitoUsername = await resolveUserId(cognitoUsername);
        console.log('Resolved Cognito Username (UUID):', cognitoUsername);

        // Extract query parameters
        const { limit = 20, nextToken } = event.arguments || {};
        const validatedLimit = Math.min(Math.max(limit, 1), 50);

        // Get additional identifiers for comprehensive search
        const originalCognitoUsername = claims['cognito:username'] || claims['sub'];
        const userEmail = claims['email'];
        const searchIdentifiers = [cognitoUsername]; // Start with resolved UUID
        
        // Add original identifier if different from resolved UUID
        if (originalCognitoUsername !== cognitoUsername) {
            searchIdentifiers.push(originalCognitoUsername);
        }
        
        // Add email if available
        if (userEmail) {
            searchIdentifiers.push(userEmail);
        }
        
        console.log('Search identifiers:', searchIdentifiers);

        // Comprehensive scan for conversations - search with all possible identifiers
        let allConversations = [];
        let lastEvaluatedKey = nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : undefined;
        
        do {
            const scanParams = {
                TableName: CONVERSATIONS_TABLE,
                Limit: validatedLimit,
            };
            
            if (lastEvaluatedKey) {
                scanParams.ExclusiveStartKey = lastEvaluatedKey;
            }
            
            console.log('Scanning conversations with params:', JSON.stringify(scanParams, null, 2));
            const response = await docClient.send(new ScanCommand(scanParams));
            
            console.log('Scan response count:', response.Items?.length || 0);
            
            // Filter conversations where user is a participant using any of the search identifiers
            const matchingConversations = (response.Items || []).filter(conversation => {
                if (!conversation.participants || !Array.isArray(conversation.participants)) {
                    return false;
                }
                
                // Check if any of the search identifiers match any participant
                return searchIdentifiers.some(identifier => 
                    conversation.participants.includes(identifier)
                );
            });
            
            console.log('Matching conversations in this batch:', matchingConversations.length);
            allConversations = allConversations.concat(matchingConversations);
            
            lastEvaluatedKey = response.LastEvaluatedKey;
            
            // Stop if we have enough conversations or no more data
            if (allConversations.length >= validatedLimit || !lastEvaluatedKey) {
                break;
            }
        } while (lastEvaluatedKey);

        console.log(`Found ${allConversations.length} conversations total`);

        // Limit to requested amount
        const items = allConversations.slice(0, validatedLimit);
        console.log(`Returning ${items.length} conversations`);

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

                    // --- UNREAD COUNT LOGIC ---
                    let unreadCount = 0;
                    try {
                        const messagesScanParams = {
                            TableName: MESSAGES_TABLE,
                            FilterExpression: 'conversationId = :conversationId AND receiverId = :receiverId AND isRead = :isRead',
                            ExpressionAttributeValues: {
                                ':conversationId': conversation.conversationId,
                                ':receiverId': cognitoUsername, // Using resolved UUID
                                ':isRead': false
                            },
                        };
                        const messagesResult = await docClient.send(new ScanCommand(messagesScanParams));
                        unreadCount = messagesResult.Items ? messagesResult.Items.length : 0;
                    } catch (err) {
                        console.error('Error counting unread messages for conversation', conversation.conversationId, err);
                    }
                    // --- END UNREAD COUNT LOGIC ---

                    console.log(`[DEBUG] Conversation ${conversation.conversationId} unreadCount for user ${cognitoUsername}:`, unreadCount);

                    return {
                        userId: cognitoUsername,
                        conversationId: conversation.conversationId,
                        otherUserId: otherUserId,
                        otherUserName: userInfo.name || `User ${otherUserId.slice(0, 6)}`,
                        otherUserProfilePic: userInfo.profilePictureUrl || null,
                        lastMessageContent: conversation.lastMessage || null,
                        lastMessageTimestamp: conversation.lastMessageTime || null,
                        unreadCount: unreadCount,
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
        if (lastEvaluatedKey) {
            nextTokenResult = Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
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