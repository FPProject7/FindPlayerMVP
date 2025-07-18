// backend/functions/signin.js

import { 
    CognitoIdentityProviderClient, 
    InitiateAuthCommand,
    AdminGetUserCommand 
} from "@aws-sdk/client-cognito-identity-provider";
import { Client } from "pg";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    console.log('*** FUNCTIONS SIGNIN CALLED ***');
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (parseError) {
        console.error("Failed to parse event body:", parseError);
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Invalid request body format." }),
        };
    }

    const { email, password } = body;

    if (!email || !password) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, password)." }),
        };
    }

    const authParams = {
        AuthFlow: "USER_PASSWORD_AUTH", // <--- CHANGED BACK TO USER_PASSWORD_AUTH
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };

    try {
        const command = new InitiateAuthCommand(authParams);
        const authResponse = await client.send(command);
        const authenticationResult = authResponse.AuthenticationResult;

        const idToken = authenticationResult.IdToken;
        const accessToken = authenticationResult.AccessToken;
        const refreshToken = authenticationResult.RefreshToken;

        let userProfile = {}; 
        let profilePictureUrl = null;

        try {
            const adminGetUserCommand = new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email 
            });
            const userDetails = await client.send(adminGetUserCommand);

            if (userDetails.UserAttributes) {
                userDetails.UserAttributes.forEach(attr => {
                    switch(attr.Name) {
                        case 'sub': userProfile.id = attr.Value; break;
                        case 'name': userProfile.name = attr.Value; break;
                        case 'email': userProfile.email = attr.Value; break;
                        case 'gender': userProfile.gender = attr.Value; break;
                        case 'custom:role': userProfile.role = attr.Value; break;
                        case 'custom:sport': userProfile.sport = attr.Value; break;
                        case 'custom:position': userProfile.position = attr.Value; break;
                        case 'custom:height': userProfile.height = attr.Value; break;
                        case 'custom:country': userProfile.country = attr.Value; break;
                        case 'custom:profilePictureUrl': 
                            profilePictureUrl = attr.Value;
                            userProfile.profilePictureUrl = attr.Value; 
                            break;
                        case 'custom:is_premium_member':
                            userProfile.isPremiumMember = attr.Value === 'true';
                            console.log(`Premium status extracted: ${attr.Value} -> ${userProfile.isPremiumMember}`);
                            break;
                        default:
                            break;
                    }
                });
            }
            console.log(`User attributes fetched for ${email}. Profile URL: ${profilePictureUrl}`);
        } catch (getUserError) {
            console.error("Error fetching user details with AdminGetUserCommand for login:", getUserError);
        }

        // --- Sync user to users table in PostgreSQL and get latest profile picture ---
        console.log('Starting database sync section...');
        try {
            // Use Cognito sub (user id) from userProfile.id if available, otherwise extract from idToken
            let cognitoSub = userProfile.id;
            console.log('Initial cognitoSub from userProfile.id:', cognitoSub);
            if (!cognitoSub && idToken) {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                cognitoSub = payload.sub;
                console.log('Extracted cognitoSub from idToken:', cognitoSub);
            }
            if (cognitoSub) {
                console.log('Proceeding with database sync for cognitoSub:', cognitoSub);
                const dbClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await dbClient.connect();
                
                // Simple premium assignment for testing - all users get premium
                let isPremiumMember = true;
                let premiumStartDate = new Date();
                
                // First, try to get existing user data to check for latest profile picture
                const existingUserQuery = `SELECT profile_picture_url, is_premium_member, premium_start_date FROM users WHERE id = $1`;
                console.log('Executing database query:', existingUserQuery, 'with cognitoSub:', cognitoSub);
                const existingUserResult = await dbClient.query(existingUserQuery, [cognitoSub]);
                console.log('Database query result rows:', existingUserResult.rows.length);
                
                let latestProfilePictureUrl = userProfile.profilePictureUrl;
                let existingPremiumStatus = isPremiumMember;
                let existingPremiumStartDate = premiumStartDate;
                
                if (existingUserResult.rows.length > 0) {
                    const existingUser = existingUserResult.rows[0];
                    console.log('Existing user data:', existingUser);
                    // Use database profile picture URL if it exists and is different from Cognito
                    if (existingUser.profile_picture_url && existingUser.profile_picture_url !== userProfile.profilePictureUrl) {
                        latestProfilePictureUrl = existingUser.profile_picture_url;
                        console.log(`Using database profile picture URL: ${latestProfilePictureUrl} instead of Cognito: ${userProfile.profilePictureUrl}`);
                    } else {
                        console.log('No database profile picture URL found or URLs are the same');
                    }
                    // Preserve existing premium status if user already has it
                    if (existingUser.is_premium_member !== null) {
                        existingPremiumStatus = existingUser.is_premium_member;
                        existingPremiumStartDate = existingUser.premium_start_date;
                    }
                } else {
                    console.log('No existing user found in database');
                }
                
                await dbClient.query(
                    `INSERT INTO users (id, email, name, role, profile_picture_url, height, country, sport, position, is_premium_member, premium_start_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     ON CONFLICT (id) DO UPDATE SET
                       email = EXCLUDED.email,
                       name = EXCLUDED.name,
                       role = EXCLUDED.role,
                       profile_picture_url = EXCLUDED.profile_picture_url,
                       height = EXCLUDED.height,
                       country = EXCLUDED.country,
                       sport = EXCLUDED.sport,
                       position = EXCLUDED.position,
                       updated_at = CURRENT_TIMESTAMP`,
                    [
                        cognitoSub,
                        userProfile.email,
                        userProfile.name,
                        userProfile.role,
                        latestProfilePictureUrl,
                        userProfile.height,
                        userProfile.country,
                        userProfile.sport,
                        userProfile.position,
                        existingPremiumStatus,
                        existingPremiumStartDate
                    ]
                );
                
                // Update userProfile with the latest profile picture URL
                userProfile.profilePictureUrl = latestProfilePictureUrl;
                console.log(`Final userProfile.profilePictureUrl set to: ${latestProfilePictureUrl}`);
                console.log('Database sync completed successfully');
                
                await dbClient.end();
            } else {
                console.error("Could not extract Cognito sub from userProfile or idToken for DB sync.");
            }
        } catch (dbError) {
            console.error("Error syncing user to users table:", dbError);
        }

        console.log('Final user profile being returned:', JSON.stringify(userProfile, null, 2));
        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*", 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "User signed in successfully",
                idToken: idToken,
                accessToken: accessToken,
                refreshToken: refreshToken,
                userProfile: userProfile 
            }),
        };
    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "An unknown error occurred during login.";
        let statusCode = 500;

        if (error.name === 'NotAuthorizedException') {
            errorMessage = "Incorrect username or password.";
            statusCode = 401;
        } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = "User is not confirmed. Please confirm your account.";
            statusCode = 403;
        } else if (error.name === 'UserNotFoundException') { 
            errorMessage = "User not found.";
            statusCode = 404; 
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: errorMessage }),
        };
    }
};