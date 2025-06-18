// backend/functions/signup.js

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

// --- FINAL CONFIGURATION ---
const REGION = "us-east-1";
const CLIENT_ID = "3bn5bf8c9ks2rpu9q7jkefhcni"; // <-- Paste your new Client ID here

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    const { email, password, role, firstName } = JSON.parse(event.body);

    const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        // SecretHash logic is completely removed
        UserAttributes: [
            {
                Name: "email",
                Value: email,
            },
            {
                Name: "custom:role",
                Value: role,
            },
            {
                Name: "given_name",
                Value: firstName,
            }
        ],
    };

    try {
        const command = new SignUpCommand(params);
        await client.send(command);
        return {
            statusCode: 201,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "User signed up successfully and is auto-confirmed." }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};