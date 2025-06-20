// backend/functions/signin.js

import { 
    CognitoIdentityProviderClient, 
    InitiateAuthCommand,
    AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.REGION || "us-east-1"; // Use env var if set, otherwise default
const CLIENT_ID = process.env.CLIENT_ID; // <--- Get from Lambda Environment Variables
const USER_POOL_ID = process.env.USER_POOL_ID; // <--- Get from Lambda Environment Variables

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

    // Basic validation for required fields
    if (!email || !password) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, password)." }),
        };
    }

    // Parameters for InitiateAuthCommand (standard user pool login)
    const authParams = {
        AuthFlow: "USER_SRP_AUTH",
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };

    try {
        // STEP 1: Authenticate the user and get tokens
        const command = new InitiateAuthCommand(authParams);
        const authResponse = await client.send(command);
        const authenticationResult = authResponse.AuthenticationResult;

        // Extract tokens
        const idToken = authenticationResult.IdToken;
        const accessToken = authenticationResult.AccessToken;
        const refreshToken = authenticationResult.RefreshToken;

        let userProfile = {}; // Initialize user profile object
        let profilePictureUrl = null;

        // STEP 2: Fetch full user attributes using AdminGetUserCommand
        // This is needed to get custom attributes like profilePictureUrl
        try {
            const adminGetUserCommand = new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email // Use the email as the username for fetching attributes
            });
            const userDetails = await client.send(adminGetUserCommand);

            // Map Cognito UserAttributes (array of { Name, Value }) to a flat userProfile object
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
                            userProfile.profilePictureUrl = attr.Value; // Store in profile
                            break;
                        // Add more custom attributes here if needed for frontend
                        default:
                            break;
                    }
                });
            }
            console.log(`User attributes fetched for ${email}. Profile URL: ${profilePictureUrl}`);
        } catch (getUserError) {
            console.error("Error fetching user details with AdminGetUserCommand for login:", getUserError);
            // Log the error but don't necessarily fail the login, just omit the full profile
            // userProfile might be incomplete but tokens are valid
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
                userProfile: userProfile // <--- Send the full user profile including profilePictureUrl
            }),
        };
    } catch (error) {
        console.error("Login error:", error); // Log the full error for debugging
        let errorMessage = "An unknown error occurred during login.";
        let statusCode = 500;

        // Refined error handling based on Cognito exceptions
        if (error.name === 'NotAuthorizedException') {
            errorMessage = "Incorrect username or password.";
            statusCode = 401; // Unauthorized
        } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = "User is not confirmed. Please confirm your account.";
            statusCode = 403; // Forbidden
        } else if (error.name === 'UserNotFoundException') { // Often handled by NotAuthorizedException, but good to be explicit
            errorMessage = "User not found.";
            statusCode = 404; // Not Found
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