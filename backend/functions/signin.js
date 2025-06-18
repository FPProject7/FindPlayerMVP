// backend/functions/signin.js

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

// --- FINAL CONFIGURATION ---
const REGION = "us-east-1";
const CLIENT_ID = "3bn5bf8c9ks2rpu9q7jkefhcni"; // <-- Paste your new Client ID here

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    const { email, password } = JSON.parse(event.body);

    const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
        // SecretHash logic is completely removed
    };

    try {
        const command = new InitiateAuthCommand(params);
        const { AuthenticationResult } = await client.send(command);

        if (AuthenticationResult) {
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    message: "User signed in successfully",
                    tokens: AuthenticationResult,
                }),
            };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};