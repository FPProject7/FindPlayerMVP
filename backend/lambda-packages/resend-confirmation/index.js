// backend/functions/resend-confirmation.js
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";

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

    const { email } = body;

    if (!email) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required field (email)." }),
        };
    }

    try {
        const resendConfirmationCodeParams = {
            ClientId: CLIENT_ID,
            Username: email,
        };

        const resendConfirmationCodeCommand = new ResendConfirmationCodeCommand(resendConfirmationCodeParams);
        await cognitoClient.send(resendConfirmationCodeCommand);

        console.log(`Confirmation code resent to ${email}.`);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Confirmation code has been resent to your email.",
                email: email
            }),
        };

    } catch (error) {
        console.error("Resend confirmation error:", error);
        
        let errorMessage = "An unknown error occurred while resending confirmation code.";
        let statusCode = 500;

        if (error.name === 'UserNotFoundException') {
            errorMessage = "User not found.";
            statusCode = 404;
        } else if (error.name === 'InvalidParameterException') {
            errorMessage = `Invalid parameter: ${error.message}`;
            statusCode = 400;
        } else if (error.name === 'LimitExceededException') {
            errorMessage = "Too many attempts. Please wait before requesting another code.";
            statusCode = 429;
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = "User is already confirmed.";
            statusCode = 400;
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