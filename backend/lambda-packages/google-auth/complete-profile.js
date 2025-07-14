import { 
    CognitoIdentityProviderClient, 
    AdminUpdateUserAttributesCommand,
    AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { Client } from "pg";

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

export const handler = async (event) => {
    console.log('*** COMPLETE PROFILE CALLED ***');
    
    try {
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

        const { 
            email, 
            role, 
            gender, 
            sport, 
            position, 
            height, 
            weight, 
            date_of_birth, 
            country,
            profilePictureBase64,
            profilePictureContentType
        } = body;

        if (!email || !role) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "Email and role are required." }),
            };
        }

        // Build user attributes array
        const userAttributes = [
            { Name: "custom:role", Value: role },
        ];

        if (gender) {
            userAttributes.push({ Name: "gender", Value: gender });
        }

        if (sport) {
            userAttributes.push({ Name: "custom:sport", Value: sport });
        }

        if (role && role.toLowerCase() === 'athlete' && position) {
            userAttributes.push({ Name: "custom:position", Value: position });
        }

        if (role && role.toLowerCase() === 'athlete' && height) {
            const heightStr = height.toString().padStart(3, '0');
            userAttributes.push({ Name: "custom:height", Value: heightStr });
        }

        if (role && role.toLowerCase() === 'athlete' && weight) {
            const weightStr = weight.toString().padStart(3, '0');
            userAttributes.push({ Name: "custom:weight", Value: weightStr });
        }

        if (date_of_birth) {
            userAttributes.push({ Name: "custom:date_of_birth", Value: date_of_birth });
        }

        if (country) {
            userAttributes.push({ Name: "custom:country", Value: country });
        }

        // Update user attributes in Cognito
        const updateUserParams = {
            UserPoolId: USER_POOL_ID,
            Username: email,
            UserAttributes: userAttributes
        };

        const updateUserCommand = new AdminUpdateUserAttributesCommand(updateUserParams);
        await cognitoClient.send(updateUserCommand);

        console.log('User profile updated in Cognito:', email);

        // Handle profile picture upload if provided
        let profilePictureUrl = null;
        if (profilePictureBase64 && process.env.S3_BUCKET_NAME) {
            try {
                const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
                const s3Client = new S3Client({ region: REGION });
                
                const contentType = profilePictureContentType || 'application/octet-stream';
                const imageBuffer = Buffer.from(profilePictureBase64, 'base64');
                const fileExtension = contentType.split('/')[1] || 'jpeg';
                const s3Key = `profile-pictures/${email.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${fileExtension}`;

                const s3UploadParams = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: s3Key,
                    Body: imageBuffer,
                    ContentType: contentType,
                };

                const putObjectCommand = new PutObjectCommand(s3UploadParams);
                await s3Client.send(putObjectCommand);

                profilePictureUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;

                // Update profile picture URL in Cognito
                const updatePictureParams = {
                    UserPoolId: USER_POOL_ID,
                    Username: email,
                    UserAttributes: [
                        { Name: "custom:profilePictureUrl", Value: profilePictureUrl }
                    ]
                };
                const updatePictureCommand = new AdminUpdateUserAttributesCommand(updatePictureParams);
                await cognitoClient.send(updatePictureCommand);

                console.log('Profile picture uploaded and updated:', profilePictureUrl);
            } catch (s3Error) {
                console.error("Error uploading profile picture:", s3Error);
                // Don't fail the profile completion if S3 upload fails
            }
        }

        // Update user in PostgreSQL database
        try {
            // Get user from Cognito to get the sub
            const getUserCommand = new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: email
            });
            const userDetails = await cognitoClient.send(getUserCommand);
            
            let cognitoSub = null;
            if (userDetails.UserAttributes) {
                const subAttr = userDetails.UserAttributes.find(attr => attr.Name === 'sub');
                if (subAttr) cognitoSub = subAttr.Value;
            }

            if (cognitoSub) {
                const dbClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
                await dbClient.connect();
                
                await dbClient.query(
                    `UPDATE users 
                     SET role = $2, 
                         gender = $3, 
                         sport = $4, 
                         position = $5, 
                         height = $6, 
                         country = $7,
                         profile_picture_url = COALESCE($8, profile_picture_url),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [
                        cognitoSub,
                        role,
                        gender,
                        sport,
                        position,
                        role && role.toLowerCase() === 'athlete' ? height : null,
                        country,
                        profilePictureUrl
                    ]
                );
                await dbClient.end();
                console.log('User profile updated in PostgreSQL database');
            }
        } catch (dbError) {
            console.error("Error updating user in database:", dbError);
            // Don't fail the profile completion if DB update fails
        }

        // Get updated user profile
        const updatedUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: email
        });
        const updatedUserDetails = await cognitoClient.send(updatedUserCommand);

        const userProfile = {};
        if (updatedUserDetails.UserAttributes) {
            updatedUserDetails.UserAttributes.forEach(attr => {
                switch(attr.Name) {
                    case 'sub': userProfile.id = attr.Value; break;
                    case 'name': userProfile.name = attr.Value; break;
                    case 'email': userProfile.email = attr.Value; break;
                    case 'gender': userProfile.gender = attr.Value; break;
                    case 'custom:role': userProfile.role = attr.Value; break;
                    case 'custom:sport': userProfile.sport = attr.Value; break;
                    case 'custom:position': userProfile.position = attr.Value; break;
                    case 'custom:height': userProfile.height = attr.Value; break;
                    case 'custom:country': userProfile.country = attr.Value; break;
                    case 'custom:profilePictureUrl': userProfile.profilePictureUrl = attr.Value; break;
                    case 'custom:is_premium_member':
                        userProfile.isPremiumMember = attr.Value === 'true';
                        break;
                    default:
                        break;
                }
            });
        }

        return {
            statusCode: 200,
            headers: { 
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Profile completed successfully",
                userProfile: userProfile
            }),
        };

    } catch (error) {
        console.error("Complete profile error:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ 
                message: "Failed to complete profile",
                error: error.message 
            }),
        };
    }
}; 