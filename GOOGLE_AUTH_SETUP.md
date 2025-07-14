# Google OAuth Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your FindPlayer MVP application.

## Prerequisites

1. AWS Cognito User Pool (already configured)
2. Google Cloud Console project
3. Domain for hosting the callback page

## Step 1: Google Cloud Console Setup

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `https://yourdomain.com/google-callback.html` (for production)
   - `http://localhost:3000/google-callback.html` (for development)
7. Note down your **Client ID** and **Client Secret**

### 1.2 Configure OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Fill in the required information:
   - App name: "FindPlayer"
   - User support email: your email
   - Developer contact information: your email
3. Add scopes:
   - `openid`
   - `email`
   - `profile`

## Step 2: AWS Lambda Functions Setup

### 2.1 Deploy Lambda Functions

1. Navigate to the `backend/lambda-packages/google-auth/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create deployment packages for each function:
   ```bash
   # For google-signin
   cd google-signin
   zip -r google-signin.zip .
   
   # For google-callback
   cd ../google-callback
   zip -r google-callback.zip .
   
   # For complete-profile
   cd ../complete-profile
   zip -r complete-profile.zip .
   ```

### 2.2 Create Lambda Functions in AWS

Create three Lambda functions with the following configurations:

#### Google Sign-In Function
- **Function name**: `findplayer-google-signin`
- **Runtime**: Node.js 18.x
- **Handler**: `google-signin.handler`
- **Environment variables**:
  ```
  REGION=us-east-1
  CLIENT_ID=29ae68avp4t8mvcg30fr97j3o2
  USER_POOL_ID=us-east-1_tS8a52861
  GOOGLE_CLIENT_ID=513294938474-501o0ri7cvf03u3cs6sggf7vd5u5dfso.apps.googleusercontent.com
  REDIRECT_URI=https://findplayer.app/google-callback.html
  ```

#### Google Callback Function
- **Function name**: `findplayer-google-callback`
- **Runtime**: Node.js 18.x
- **Handler**: `google-callback.handler`
- **Environment variables**:
  ```
  REGION=us-east-1
  CLIENT_ID=your_cognito_client_id
  USER_POOL_ID=your_cognito_user_pool_id
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  REDIRECT_URI=https://yourdomain.com/google-callback.html
  DATABASE_URL=your_postgresql_connection_string
  S3_BUCKET_NAME=your_s3_bucket_name
  ```

#### Complete Profile Function
- **Function name**: `findplayer-complete-profile`
- **Runtime**: Node.js 18.x
- **Handler**: `complete-profile.handler`
- **Environment variables**:
  ```
  REGION=us-east-1
  CLIENT_ID=your_cognito_client_id
  USER_POOL_ID=your_cognito_user_pool_id
  DATABASE_URL=your_postgresql_connection_string
  S3_BUCKET_NAME=your_s3_bucket_name
  ```

### 2.3 Configure Lambda Permissions

Ensure your Lambda functions have the following IAM permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminInitiateAuth",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminUpdateUserAttributes"
            ],
            "Resource": "arn:aws:cognito-idp:us-east-1:*:userpool/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::your-s3-bucket/*"
        }
    ]
}
```

## Step 3: API Gateway Setup

### 3.1 Create API Gateway Endpoints

Create three new endpoints in your API Gateway:

1. **POST /google-signin** → `findplayer-google-signin` Lambda
2. **POST /google-callback** → `findplayer-google-callback` Lambda  
3. **POST /complete-profile** → `findplayer-complete-profile` Lambda

### 3.2 Configure CORS

For each endpoint, enable CORS with the following settings:
- Access-Control-Allow-Origin: `*`
- Access-Control-Allow-Headers: `Content-Type,Authorization`
- Access-Control-Allow-Methods: `POST,OPTIONS`

## Step 4: Frontend Configuration

### 4.1 Update Environment Variables

Add the following to your frontend environment variables:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

### 4.2 Deploy Callback Page

Upload the `frontend/public/google-callback.html` file to your domain at:
- `https://yourdomain.com/google-callback.html`

## Step 5: Cognito User Pool Configuration

### 5.1 Add Custom Attributes

Ensure your Cognito User Pool has the following custom attributes:

- `custom:google_id` (String, mutable)
- `custom:role` (String, mutable)
- `custom:sport` (String, mutable)
- `custom:position` (String, mutable)
- `custom:height` (String, mutable)
- `custom:country` (String, mutable)
- `custom:profilePictureUrl` (String, mutable)

### 5.2 App Client Configuration

Your Cognito App Client should have:
- **Generate client secret**: `false`
- **Auth flows**: `ADMIN_NO_SRP_AUTH`, `USER_PASSWORD_AUTH`
- **OAuth flows**: `authorizationCodeGrant`, `implicitCodeGrant`
- **Callback URLs**: `https://yourdomain.com/callback`

## Step 6: Testing

### 6.1 Test the Flow

1. Start your frontend application
2. Click "Continue with Google" on the login page
3. Complete Google OAuth
4. If it's a new user, complete the profile form
5. Verify the user is created in Cognito and your database

### 6.2 Troubleshooting

**Common Issues:**

1. **CORS errors**: Ensure API Gateway CORS is properly configured
2. **Invalid redirect URI**: Check that the redirect URI matches exactly in Google Console
3. **Lambda timeout**: Increase timeout for callback function (30 seconds recommended)
4. **Database connection**: Verify DATABASE_URL is correct and accessible

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **State Parameter**: The implementation includes state parameter validation
3. **Token Storage**: Tokens are stored securely in the browser
4. **Input Validation**: All user inputs are validated on both frontend and backend
5. **Error Handling**: Sensitive error messages are not exposed to users

## Environment Variables Summary

### Backend Lambda Functions
```
REGION=us-east-1
CLIENT_ID=your_cognito_client_id
USER_POOL_ID=your_cognito_user_pool_id
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=https://yourdomain.com/google-callback.html
DATABASE_URL=your_postgresql_connection_string
S3_BUCKET_NAME=your_s3_bucket_name
```

### Frontend
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
```

## Support

If you encounter any issues during setup, check:
1. AWS CloudWatch logs for Lambda function errors
2. Browser console for frontend errors
3. Google Cloud Console for OAuth configuration issues
4. API Gateway logs for endpoint errors 