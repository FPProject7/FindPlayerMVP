// backend/functions/signup.js

import { 
    CognitoIdentityProviderClient, 
    SignUpCommand, 
    AdminInitiateAuthCommand,
    AdminUpdateUserAttributesCommand,
    AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "pg";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

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

    // Destructure new profilePictureContentType
    const { email, password, role, name, gender, sport, position, height, weight, date_of_birth, country, profilePictureBase64, profilePictureContentType } = body;

    if (!email || !password || !name || !role) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, password, name, role)." }),
        };
    }

    const userAttributes = [
        { Name: "email", Value: email },
        { Name: "name", Value: name },
        { Name: "given_name", Value: name },
        { Name: "gender", Value: gender },
        { Name: "custom:role", Value: role },
        { Name: "custom:sport", Value: sport },
    ];

    if (role && role.toLowerCase() === 'athlete' && position) {
        userAttributes.push({ Name: "custom:position", Value: position });
    }

    if (role && role.toLowerCase() === 'athlete' && height) {
        // Ensure height meets minimum length validation by padding with leading zeros if needed
        const heightStr = height.toString().padStart(3, '0');
        userAttributes.push({ Name: "custom:height", Value: heightStr });
    }

    if (role && role.toLowerCase() === 'athlete' && weight) {
        // Ensure weight meets minimum length validation by padding with leading zeros if needed
        const weightStr = weight.toString().padStart(3, '0');
        userAttributes.push({ Name: "custom:weight", Value: weightStr });
    }

    if (date_of_birth) {
        userAttributes.push({ Name: "custom:date_of_birth", Value: date_of_birth });
    }

    if (country) {
        userAttributes.push({ Name: "custom:country", Value: country });
    }

    const signUpParams = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
    };

    let profilePictureUrl = null;
    let cognitoSub = null;
    let signupSucceeded = false;
    let idToken = null, accessToken = null, refreshToken = null;

    try {
        // Step 1: Sign up the user
        const signUpCommand = new SignUpCommand(signUpParams);
        await cognitoClient.send(signUpCommand);
        signupSucceeded = true;

        // Step 2: Try to auto-login
        try {
            const initiateAuthParams = {
                AuthFlow: "ADMIN_NO_SRP_AUTH",
                UserPoolId: USER_POOL_ID,
                ClientId: CLIENT_ID,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            };
            const initiateAuthCommand = new AdminInitiateAuthCommand(initiateAuthParams);
            const authResponse = await cognitoClient.send(initiateAuthCommand);
            const authenticationResult = authResponse.AuthenticationResult;
            idToken = authenticationResult.IdToken;
            accessToken = authenticationResult.AccessToken;
            refreshToken = authenticationResult.RefreshToken;
        } catch (autoLoginError) {
            // Auto-login failed, but signup succeeded
            idToken = null;
            accessToken = null;
            refreshToken = null;
        }

        // Step 3: Handle Profile Picture Upload to S3 (if provided)
        if (profilePictureBase64 && S3_BUCKET_NAME) {
            try {
                const contentType = profilePictureContentType || 'application/octet-stream';
                const base64Data = profilePictureBase64;
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const fileExtension = contentType.split('/')[1] || 'jpeg';
                const s3Key = `profile-pictures/${email.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExtension}`;
                const s3UploadParams = {
                    Bucket: S3_BUCKET_NAME,
                    Key: s3Key,
                    Body: imageBuffer,
                    ContentType: contentType,
                };
                const putObjectCommand = new PutObjectCommand(s3UploadParams);
                await s3Client.send(putObjectCommand);
                profilePictureUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
                // Update Cognito User Attributes with Profile Picture URL
                const updateUserAttributesParams = {
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    UserAttributes: [
                        { Name: "custom:profilePictureUrl", Value: profilePictureUrl }
                    ],
                };
                const updateUserAttributesCommand = new AdminUpdateUserAttributesCommand(updateUserAttributesParams);
                await cognitoClient.send(updateUserAttributesCommand);
            } catch (s3Error) {
                profilePictureUrl = null;
            }
        }

        // Step 4: Get Cognito sub (user id) for DB sync
        try {
            if (idToken) {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                cognitoSub = payload.sub;
            } else {
                // If no idToken (auto-login failed), fetch user from Cognito
                const adminGetUserCommand = new AdminGetUserCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: email
                });
                const userDetails = await cognitoClient.send(adminGetUserCommand);
                if (userDetails.UserAttributes) {
                    const subAttr = userDetails.UserAttributes.find(attr => attr.Name === 'sub');
                    if (subAttr) cognitoSub = subAttr.Value;
                }
            }
        } catch (getUserError) {
            cognitoSub = null;
        }

        // Before DB sync
        console.log("Attempting to sync user to users table:", { cognitoSub, email, name, role, profilePictureUrl });

        // Step 5: Sync user to users table in PostgreSQL (even if auto-login failed)
        try {
            if (cognitoSub) {
                const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await client.connect();
                await client.query(
                    `INSERT INTO users (id, email, name, role, profile_picture_url, height, weight, date_of_birth, country, sport, position, gender)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (id) DO UPDATE SET
                       email = EXCLUDED.email,
                       name = EXCLUDED.name,
                       role = EXCLUDED.role,
                       profile_picture_url = EXCLUDED.profile_picture_url,
                       height = EXCLUDED.height,
                       weight = EXCLUDED.weight,
                       date_of_birth = EXCLUDED.date_of_birth,
                       country = EXCLUDED.country,
                       sport = EXCLUDED.sport,
                       position = EXCLUDED.position,
                       gender = EXCLUDED.gender,
                       updated_at = CURRENT_TIMESTAMP`,
                    [
                        cognitoSub,
                        email,
                        name,
                        role,
                        profilePictureUrl,
                        role && role.toLowerCase() === 'athlete' ? height : null,
                        role && role.toLowerCase() === 'athlete' ? weight : null,
                        date_of_birth || null,
                        country,
                        sport,
                        position,
                        gender
                    ]
                );
                await client.end();
                console.log("User successfully synced to users table.");
            }
        } catch (dbError) {
            console.error("DB sync failed:", dbError);
            throw dbError; // Optionally re-throw to surface in Lambda logs
        }

        const userProfile = {
            name: name,
            email: email,
            role: role,
            gender: gender,
            sport: sport,
            position: position,
            height: role && role.toLowerCase() === 'athlete' ? height : null,
            weight: role && role.toLowerCase() === 'athlete' ? weight : null,
            date_of_birth: date_of_birth,
            country: country,
            profilePictureUrl: profilePictureUrl
        };

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "User signed up and logged in successfully.",
                idToken: idToken,
                accessToken: accessToken,
                refreshToken: refreshToken,
                userProfile: userProfile
            }),
        };

    } catch (error) {
        console.error("Signup or Auto-login error:", error);

        let errorMessage = "An unknown error occurred during signup.";
        let statusCode = 500;

        if (error.name === 'UsernameExistsException') {
            errorMessage = "A user with this email already exists.";
            statusCode = 409;
        } else if (error.name === 'InvalidPasswordException') {
            errorMessage = "Password does not meet requirements.";
            statusCode = 400;
        } else if (error.name === 'NotAuthorizedException') {
            errorMessage = "Cognito authorization failed during auto-login. Check user confirmation status or credentials.";
            statusCode = 401;
        } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = "User is not confirmed. Please confirm your account (if auto-confirmation is off).";
            statusCode = 403;
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