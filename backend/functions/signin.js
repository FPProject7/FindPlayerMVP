// backend/functions/signin.js

import { 
    CognitoIdentityProviderClient, 
    InitiateAuthCommand,
    AdminGetUserCommand 
} from "@aws-sdk/client-cognito-identity-provider";
const REGION = "us-east-1";
const CLIENT_ID = "29ae68avp4t8mvcg30fr97j3o2";

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
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
                        case 'name': userProfile.name = attr.Value; break;
                        case 'email': userProfile.email = attr.Value; break;
                        case 'gender': userProfile.gender = attr.Value; break;
                        case 'custom:role': userProfile.role = attr.Value; break;
                        case 'custom:sport': userProfile.sport = attr.Value; break;
                        case 'custom:position': userProfile.position = attr.Value; break;
                        case 'custom:profilePictureUrl': 
                            profilePictureUrl = attr.Value;
                            userProfile.profilePictureUrl = attr.Value; 
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