// backend/functions/forgot-password.js
import { CognitoIdentityProviderClient, ForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = "us-east-1";
const CLIENT_ID = "29ae68avp4t8mvcg30fr97j3o2";

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    const { email } = JSON.parse(event.body);
    const params = {
        ClientId: CLIENT_ID,
        Username: email,
    };
    try {
        await client.send(new ForgotPasswordCommand(params));
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Password reset code has been sent." }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};