// backend/functions/verify-auth.js
import { promisify } from 'util';
import { a as jwkToPem } from 'jwk-to-pem';
import { verify as jwtVerify } from 'jsonwebtoken';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import https from 'https';

const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Cache for JWKS to avoid fetching on every request
let jwksCache = null;
let jwksCacheExpiry = 0;

// Fetch JWKS from Cognito
async function fetchJWKS(userPoolId) {
    const url = `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Get JWKS with caching
async function getJWKS(userPoolId) {
    const now = Date.now();
    if (!jwksCache || now > jwksCacheExpiry) {
        jwksCache = await fetchJWKS(userPoolId);
        jwksCacheExpiry = now + (60 * 60 * 1000); // Cache for 1 hour
    }
    return jwksCache;
}

// Verify JWT token
async function verifyToken(token, userPoolId) {
    try {
        // Decode the token header to get the key ID
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
        const jwks = await getJWKS(userPoolId);
        
        // Find the key that matches the key ID
        const key = jwks.keys.find(k => k.kid === header.kid);
        if (!key) {
            throw new Error('No matching key found');
        }

        // Convert JWK to PEM
        const pem = jwkToPem(key);
        
        // Verify the token
        const verifyAsync = promisify(jwtVerify);
        const decoded = await verifyAsync(token, pem, {
            algorithms: ['RS256'],
            issuer: `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`,
            audience: process.env.CLIENT_ID // Your Cognito App Client ID
        });

        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
}

// This function can be used as a Lambda Authorizer in API Gateway.
// It checks the token from the request header.
export const handler = async (event) => {
    const token = event.authorizationToken; // API Gateway passes the token here

    if (!token) {
        throw new Error('Unauthorized'); // No token provided
    }

    try {
        // Remove 'Bearer ' prefix if present
        const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
        
        // Verify the token
        const decoded = await verifyToken(tokenValue, process.env.USER_POOL_ID);
        
        console.log("Token verified successfully for user:", decoded.sub);

        // If verification is successful, return a policy that ALLOWS access.
        return generatePolicy(decoded.sub, 'Allow', event.methodArn);

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