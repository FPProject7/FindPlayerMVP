// backend/functions/signup.js

import { 
    CognitoIdentityProviderClient, 
    SignUpCommand, 
    AdminInitiateAuthCommand,
    AdminUpdateUserAttributesCommand 
} from "@aws-sdk/client-cognito-identity-provider";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    const { email, password, role, firstName, gender, sport, position, profilePictureBase64, profilePictureContentType, height } = body; // <--- New field

    if (!email || !password || !firstName || !role) {
        return {
            statusCode: 400,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Missing required fields (email, password, firstName, role)." }),
        };
    }

    const userAttributes = [
        { Name: "email", Value: email },
        { Name: "name", Value: firstName },
        { Name: "given_name", Value: firstName },
        { Name: "gender", Value: gender },
        { Name: "custom:role", Value: role },
        { Name: "custom:sport", Value: sport },
    ];

    if (role && role.toLowerCase() === 'athlete' && position) {
        userAttributes.push({ Name: "custom:position", Value: position });
    }

    const signUpParams = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: userAttributes,
    };

    let profilePictureUrl = null;

    try {
        const signUpCommand = new SignUpCommand(signUpParams);
        await cognitoClient.send(signUpCommand);

        console.log(`User ${email} signed up successfully.`);

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

        console.log(`User ${email} auto-authenticated successfully.`);

        const authenticationResult = authResponse.AuthenticationResult;
        const idToken = authenticationResult.IdToken;
        const accessToken = authenticationResult.AccessToken;
        const refreshToken = authenticationResult.RefreshToken;

        // STEP 3: Handle Profile Picture Upload to S3 (if provided)
        if (profilePictureBase64 && S3_BUCKET_NAME) {
            try {
                // Use profilePictureContentType directly
                const contentType = profilePictureContentType || 'application/octet-stream'; // <--- Use provided content type
                const base64Data = profilePictureBase64; // No need to remove prefix here, frontend does it
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Generate a unique file name (e.g., user_email-timestamp.ext)
                const fileExtension = contentType.split('/')[1] || 'jpeg';
                const s3Key = `profile-pictures/${email.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExtension}`;

                const s3UploadParams = {
                    Bucket: S3_BUCKET_NAME,
                    Key: s3Key,
                    Body: imageBuffer,
                    ContentType: contentType, // <--- Use provided content type
                };

                const putObjectCommand = new PutObjectCommand(s3UploadParams);
                await s3Client.send(putObjectCommand);

                profilePictureUrl = `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;
                console.log(`Profile picture uploaded to S3: ${profilePictureUrl}`);

                // STEP 4: Update Cognito User Attributes with Profile Picture URL
                const updateUserAttributesParams = {
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    UserAttributes: [
                        { Name: "custom:profilePictureUrl", Value: profilePictureUrl }
                    ],
                };
                const updateUserAttributesCommand = new AdminUpdateUserAttributesCommand(updateUserAttributesParams);
                await cognitoClient.send(updateUserAttributesCommand);
                console.log(`Cognito user attributes updated with profile picture URL for ${email}`);

            } catch (s3Error) {
                console.error("Error uploading profile picture to S3 or updating Cognito attributes:", s3Error);
                profilePictureUrl = null;
            }
        } else {
            console.log("No profile picture provided or S3 bucket not configured.");
        }

        const userProfile = {
            name: firstName,
            email: email,
            role: role,
            gender: gender,
            sport: sport,
            position: position,
            profilePictureUrl: profilePictureUrl,
            height: height
        };

        // --- Sync user to users table in PostgreSQL ---
        try {
            // Extract Cognito sub (user id) from the idToken
            let cognitoSub = null;
            if (idToken) {
                const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
                cognitoSub = payload.sub;
            }
            if (cognitoSub) {
                const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await client.connect();
                await client.query(
                    `INSERT INTO users (id, email, name, role, profile_picture_url, height)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (id) DO UPDATE SET
                       email = EXCLUDED.email,
                       name = EXCLUDED.name,
                       role = EXCLUDED.role,
                       profile_picture_url = EXCLUDED.profile_picture_url,
                       height = EXCLUDED.height,
                       updated_at = CURRENT_TIMESTAMP`,
                    [
                        cognitoSub,
                        email,
                        firstName,
                        role,
                        profilePictureUrl,
                        role && role.toLowerCase() === 'athlete' ? height : null
                    ]
                );
                await client.end();
            } else {
                console.error("Could not extract Cognito sub from idToken for DB sync.");
            }
        } catch (dbError) {
            console.error("Error syncing user to users table:", dbError);
        }

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