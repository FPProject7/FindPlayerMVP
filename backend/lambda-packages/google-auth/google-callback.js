import { 
    CognitoIdentityProviderClient, 
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminInitiateAuthCommand,
    AdminGetUserCommand,
    AdminUpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { Client } from "pg";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://yourdomain.com/google-callback";

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    console.log('*** GOOGLE CALLBACK PROCESSING ***');
    
    try {
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

        const { code, state } = body;

        if (!code) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Authorization code is required." }),
            };
        }

        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            console.error('Google token exchange failed:', await tokenResponse.text());
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Failed to exchange authorization code for token." }),
            };
        }

        const tokenData = await tokenResponse.json();
        const { access_token, id_token } = tokenData;

        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        if (!userInfoResponse.ok) {
            console.error('Failed to get user info from Google');
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Failed to get user information from Google." }),
            };
        }

        const googleUser = await userInfoResponse.json();
        const { email, name, given_name, family_name, picture } = googleUser;

        console.log('Google user info:', { email, name, picture });

        // Check if user exists in Cognito
        let userExists = false;
        let cognitoUser = null;

        try {
            const adminGetUserCommand = new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email
            });
            cognitoUser = await cognitoClient.send(adminGetUserCommand);
            userExists = true;
            console.log('User exists in Cognito:', email);
        } catch (error) {
            if (error.name === 'UserNotFoundException') {
                console.log('User does not exist in Cognito, will create:', email);
                userExists = false;
            } else {
                throw error;
            }
        }

        let idToken, accessToken, refreshToken, userProfile;

        if (!userExists) {
            // Create new Google user in Cognito
            const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
            
            const createUserParams = {
                UserPoolId: USER_POOL_ID,
                Username: email,
                UserAttributes: [
                    { Name: "email", Value: email },
                    { Name: "email_verified", Value: "true" },
                    { Name: "name", Value: name || given_name || email },
                    { Name: "given_name", Value: given_name || name || email },
                    { Name: "custom:google_id", Value: googleUser.id },
                    { Name: "custom:profilePictureUrl", Value: picture || "" },
                ],
                MessageAction: "SUPPRESS" // Don't send welcome email
            };

            const createUserCommand = new AdminCreateUserCommand(createUserParams);
            await cognitoClient.send(createUserCommand);

            // Set a permanent password
            const setPasswordParams = {
                UserPoolId: USER_POOL_ID,
                Username: email,
                Password: tempPassword,
                Permanent: true
            };
            const setPasswordCommand = new AdminSetUserPasswordCommand(setPasswordParams);
            await cognitoClient.send(setPasswordCommand);

            console.log('New Google user created in Cognito:', email);

            // Authenticate the new user
            const authParams = {
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                UserPoolId: USER_POOL_ID,
                ClientId: CLIENT_ID,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: tempPassword,
                },
            };

            const initiateAuthCommand = new AdminInitiateAuthCommand(authParams);
            const authResponse = await cognitoClient.send(initiateAuthCommand);
            const authenticationResult = authResponse.AuthenticationResult;

            idToken = authenticationResult.IdToken;
            accessToken = authenticationResult.AccessToken;
            refreshToken = authenticationResult.RefreshToken;

        } else {
            // Check if existing user is a Google user
            const googleIdAttr = cognitoUser.UserAttributes.find(attr => attr.Name === 'custom:google_id');
            
            if (!googleIdAttr) {
                // This is an email/password user, not a Google user
                return {
                    statusCode: 400,
                    headers: { "Access-Control-Allow-Origin": "*" },
                    body: JSON.stringify({ 
                        message: "An account with this email already exists using email/password. Please sign in with your password or use a different Google account.",
                        error: "EMAIL_EXISTS_WITH_PASSWORD"
                    }),
                };
            }

            // This is an existing Google user - update their info if needed
            const updateAttributes = [];
            if (picture && (!cognitoUser.UserAttributes.find(attr => attr.Name === 'custom:profilePictureUrl')?.Value || 
                           cognitoUser.UserAttributes.find(attr => attr.Name === 'custom:profilePictureUrl')?.Value !== picture)) {
                updateAttributes.push({ Name: "custom:profilePictureUrl", Value: picture });
            }
            
            if (updateAttributes.length > 0) {
                const updateUserParams = {
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    UserAttributes: updateAttributes
                };
                const updateUserCommand = new AdminUpdateUserAttributesCommand(updateUserParams);
                await cognitoClient.send(updateUserCommand);
                console.log('Updated Google user attributes in Cognito:', email);
            }

            // For existing Google users, we need to authenticate them
            // Since we don't store their password, we'll need to use a different approach
            // For now, we'll create a temporary password and authenticate
            const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
            
            const setPasswordParams = {
                UserPoolId: USER_POOL_ID,
                Username: email,
                Password: tempPassword,
                Permanent: true
            };
            const setPasswordCommand = new AdminSetUserPasswordCommand(setPasswordParams);
            await cognitoClient.send(setPasswordCommand);

            const authParams = {
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                UserPoolId: USER_POOL_ID,
                ClientId: CLIENT_ID,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: tempPassword,
                },
            };

            const initiateAuthCommand = new AdminInitiateAuthCommand(authParams);
            const authResponse = await cognitoClient.send(initiateAuthCommand);
            const authenticationResult = authResponse.AuthenticationResult;

            idToken = authenticationResult.IdToken;
            accessToken = authenticationResult.AccessToken;
            refreshToken = authenticationResult.RefreshToken;
        }

        // Get user profile from Cognito
        const getUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email
        });
        const userDetails = await cognitoClient.send(getUserCommand);

        userProfile = {};
        let profilePictureUrl = null;

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
                        break;
                    default:
                        break;
                }
            });
        }

        // Sync user to PostgreSQL database
        try {
            let cognitoSub = userProfile.id;
            if (!cognitoSub && idToken) {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                cognitoSub = payload.sub;
            }
            
            if (cognitoSub) {
                const dbClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await dbClient.connect();
                
                await dbClient.query(
                    `INSERT INTO users (id, email, name, role, profile_picture_url)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE SET
                       email = EXCLUDED.email,
                       name = EXCLUDED.name,
                       profile_picture_url = EXCLUDED.profile_picture_url,
                       updated_at = CURRENT_TIMESTAMP`,
                    [
                        cognitoSub,
                        userProfile.email,
                        userProfile.name,
                        userProfile.role || 'athlete', // Default role
                        userProfile.profilePictureUrl
                    ]
                );
                await dbClient.end();
                console.log('User synced to PostgreSQL database');
            }
        } catch (dbError) {
            console.error("Error syncing user to database:", dbError);
            // Don't fail the authentication if DB sync fails
        }

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Google authentication successful",
                idToken: idToken,
                accessToken: accessToken,
                refreshToken: refreshToken,
                userProfile: userProfile,
                isNewUser: !userExists,
                needsProfileCompletion: !userProfile.role // If no role is set, user needs to complete profile
            }),
        };

    } catch (error) {
        console.error("Google callback error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ 
                message: "Google authentication failed",
                error: error.message 
            }),
        };
    }
}; 