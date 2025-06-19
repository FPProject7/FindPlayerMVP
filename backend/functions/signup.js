// backend/functions/signup.js

import { CognitoIdentityProviderClient, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from 'crypto';

const REGION = "us-east-1";
const CLIENT_ID = "3bn5bf8c9ks2rpu9q7jkefhcni";

const client = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    const { email, password, role, firstName, gender, sport, position } = JSON.parse(event.body);

    const userAttributes = [
        { Name: "email", Value: email },
        { Name: "name", Value: firstName },
        { Name: "given_name", Value: firstName },
        { Name: "gender", Value: gender },
        { Name: "custom:role", Value: role },
        { Name: "custom:sport", Value: sport },
    ];

    if (role === 'Athlete' && position) {
        userAttributes.push({ Name: "custom:position", Value: position });
    }

    const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
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