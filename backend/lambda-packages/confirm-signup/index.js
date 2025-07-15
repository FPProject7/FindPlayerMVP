// backend/functions/confirm-signup.js
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

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

    const { email, confirmationCode } = body;

    if (!email || !confirmationCode) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, confirmationCode)." }),
        };
    }

    try {
        const confirmSignUpParams = {
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode,
        };

        const confirmSignUpCommand = new ConfirmSignUpCommand(confirmSignUpParams);
        await cognitoClient.send(confirmSignUpCommand);

        console.log(`User ${email} confirmed successfully.`);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Email verified successfully. You can now sign in.",
                email: email
            }),
        };

    } catch (error) {
        console.error("Confirmation error:", error);
        
        let errorMessage = "An unknown error occurred during confirmation.";
        let statusCode = 500;

        if (error.name === 'CodeMismatchException') {
            errorMessage = "Invalid confirmation code. Please check your email and try again.";
            statusCode = 400;
        } else if (error.name === 'ExpiredCodeException') {
            errorMessage = "Confirmation code has expired. Please request a new one.";
            statusCode = 400;
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = "User is already confirmed.";
            statusCode = 400;
        } else if (error.name === 'UserNotFoundException') {
            errorMessage = "User not found.";
            statusCode = 404;
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