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

        // --- Sync user to users table in PostgreSQL ---
        try {
            // Use Cognito sub (user id) from userProfile.id if available, otherwise extract from idToken
            let cognitoSub = userProfile.id;
            if (!cognitoSub && idToken) {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                cognitoSub = payload.sub;
            }
            if (cognitoSub) {
                const dbClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await dbClient.connect();
                
                // First, check if user exists and get current profile_picture_url
                const existingUser = await dbClient.query(
                    'SELECT profile_picture_url FROM users WHERE id = $1',
                    [cognitoSub]
                );
                
                // Use existing profile_picture_url if available, otherwise use Cognito URL
                const finalProfilePictureUrl = existingUser.rows.length > 0 && existingUser.rows[0].profile_picture_url 
                    ? existingUser.rows[0].profile_picture_url 
                    : userProfile.profilePictureUrl;
                
                await dbClient.query(
                    `INSERT INTO users (id, email, name, role, profile_picture_url, height, country, sport, position)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                       email = EXCLUDED.email,
                       name = EXCLUDED.name,
                       role = EXCLUDED.role,
                       profile_picture_url = $5,
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
                        finalProfilePictureUrl,
                        userProfile.height,
                        userProfile.country,
                        userProfile.sport,
                        userProfile.position
                    ]
                );
                await dbClient.end();
                
                // Update the userProfile with the final profile picture URL
                userProfile.profilePictureUrl = finalProfilePictureUrl;
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