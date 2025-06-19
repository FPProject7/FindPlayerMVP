// backend/functions/signin.js

import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
const REGION = "us-east-1";
const CLIENT_ID = "29ae68avp4t8mvcg30fr97j3o2";

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
    };

    try {
        const command = new InitiateAuthCommand(params);
        const { AuthenticationResult } = await client.send(command);
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                message: "User signed in successfully",
                tokens: AuthenticationResult,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};