// backend/functions/verify-auth.js
import { promisify } from 'util';
import { a as jwkToPem } from 'jwk-to-pem';
import { verify as jwtVerify } from 'jsonwebtoken';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// This function can be used as a Lambda Authorizer in API Gateway.
// It checks the token from the request header.
export const handler = async (event) => {
    const token = event.authorizationToken; // API Gateway passes the token here

    if (!token) {
        throw new Error('Unauthorized'); // No token provided
    }

    try {
        // Here you would add logic to fetch the Cognito public keys (JWKS)
        // and verify the token against them. This is an advanced topic.

        // For now, we will just simulate a successful verification.
        console.log("Token received and would be verified here:", token);

        // If verification is successful, return a policy that ALLOWS access.
        return generatePolicy('user', 'Allow', event.methodArn);

    } catch (e) {
        console.error("Token verification failed:", e);
        throw new Error('Unauthorized'); // Token is invalid
    }
};

// Helper function to generate an IAM policy for API Gateway.
const generatePolicy = (principalId, effect, resource) => {
    const authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            }],
        };
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
};