import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://yourdomain.com/google-callback";

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    console.log('*** GOOGLE SIGNIN INITIATED ***');
    
    try {
        // Generate a random state parameter for security
        const state = Math.random().toString(36).substring(2, 15);
        
        // Construct Google OAuth URL
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('openid email profile')}&` +
            `state=${state}&` +
            `access_type=offline&` +
            `prompt=consent`;

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Google OAuth URL generated successfully",
                authUrl: googleAuthUrl,
                state: state
            }),
        };
    } catch (error) {
        console.error("Google signin error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ 
                message: "Failed to generate Google OAuth URL",
                error: error.message 
            }),
        };
    }
}; 