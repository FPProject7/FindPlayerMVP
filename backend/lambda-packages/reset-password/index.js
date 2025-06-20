// backend/functions/reset-password.js
import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = "us-east-1";
const CLIENT_ID = "3bn5bf8c9ks2rpu9q7jkefhcni";

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    const { email, password, confirmationCode } = JSON.parse(event.body);
    const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        ConfirmationCode: confirmationCode,
    };
    try {
        await client.send(new ConfirmForgotPasswordCommand(params));
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Password has been reset successfully." }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: error.message }),
        };
    }
};