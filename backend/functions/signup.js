// backend/functions/signup.js

import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    AdminInitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;

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

    // Destructure all expected fields from the frontend
    const { email, password, role, firstName, gender, sport, position, profilePictureBase64 } = body;

    // Basic validation for required fields
    if (!email || !password || !firstName || !role) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, password, firstName, role)." }),
        };
    }

    // Cognito User Attributes
    const userAttributes = [
        { Name: "email", Value: email },
        { Name: "name", Value: firstName },
        { Name: "given_name", Value: firstName },
        { Name: "gender", Value: gender },
        { Name: "custom:role", Value: role },
        { Name: "custom:sport", Value: sport },
    ];

    if (role && role.toLowerCase() === 'athlete' && position) {
        userAttributes.push({ Name: "custom:position", Value: position });
    }

    const signUpParams = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
    };

    try {
        const signUpCommand = new SignUpCommand(signUpParams);
        await client.send(signUpCommand);

        console.log(`User ${email} signed up successfully.`);

        const initiateAuthParams = {
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        };

        const initiateAuthCommand = new AdminInitiateAuthCommand(initiateAuthParams);
        const authResponse = await client.send(initiateAuthCommand);

        console.log(`User ${email} auto-authenticated successfully.`);

        const authenticationResult = authResponse.AuthenticationResult;
        const idToken = authenticationResult.IdToken;
        const accessToken = authenticationResult.AccessToken;
        const refreshToken = authenticationResult.RefreshToken;

        const userProfile = {
            name: firstName,
            email: email,
            role: role,
            gender: gender,
            sport: sport,
            position: position
        };

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "User signed up and logged in successfully.",
                idToken: idToken,
                accessToken: accessToken,
                refreshToken: refreshToken,
                userProfile: userProfile
            }),
        };

    } catch (error) {
        console.error("Signup or Auto-login error:", error);

        let errorMessage = "An unknown error occurred during signup.";
        let statusCode = 500;

        if (error.name === 'UsernameExistsException') {
            errorMessage = "A user with this email already exists.";
            statusCode = 409;
        } else if (error.name === 'InvalidPasswordException') {
            errorMessage = "Password does not meet requirements.";
            statusCode = 400;
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = "Cognito authorization failed during auto-login. Check user confirmation status or credentials.";
            statusCode = 401;
        } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = "User is not confirmed. Please confirm your account (if auto-confirmation is off).";
            statusCode = 403;
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: errorMessage }),
        };
    }
};