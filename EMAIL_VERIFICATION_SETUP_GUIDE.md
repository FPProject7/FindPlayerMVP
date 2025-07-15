# Email Verification Setup Guide

This guide explains how to set up email verification for your FindPlayer MVP application using AWS Cognito's built-in email verification features.

## Overview

The email verification workflow consists of:
1. **Modified Signup Process**: Users sign up but are not auto-logged in
2. **Email Verification**: Users receive a verification code via email
3. **Confirmation Process**: Users enter the code to verify their email
4. **Login Access**: Once verified, users can sign in normally

## Backend Changes Made

### 1. New Lambda Functions Created

#### `confirm-signup.js`
- **Purpose**: Verifies user email with confirmation code
- **Endpoint**: `/confirm-signup`
- **Method**: POST
- **Body**: `{ email, confirmationCode }`

#### `resend-confirmation.js`
- **Purpose**: Resends verification code to user's email
- **Endpoint**: `/resend-confirmation`
- **Method**: POST
- **Body**: `{ email }`

### 2. Modified Signup Function

The existing `signup.js` function has been modified to:
- Disable auto-login after signup
- Return `requiresVerification: true` flag
- Include user email in response

### 3. Enhanced Verify-Auth Function

The `verify-auth.js` function now:
- Properly verifies JWT tokens using Cognito JWKS
- Caches JWKS for performance
- Returns proper IAM policies

## Frontend Changes Made

### 1. New Email Verification Page

**File**: `frontend/src/pages/Auth/EmailVerificationPage.jsx`
- Handles verification code input
- Provides resend functionality
- Shows success/error messages
- Redirects to login after successful verification

### 2. Updated Signup Forms

All signup forms (Athlete, Coach, Scout) now:
- Check for `requiresVerification` flag in response
- Redirect to `/verify-email` if verification is required
- Maintain backward compatibility for auto-login

### 3. New Route Added

**Route**: `/verify-email`
- Public route (no authentication required)
- Accepts email via state or query parameters

## AWS Cognito Configuration Required

### 1. Disable Auto-Confirmation

In your AWS Cognito User Pool settings:

1. Go to AWS Console → Cognito → User Pools → Your User Pool
2. Navigate to "Sign-up experience" → "Cognito-assisted verification and confirmation"
3. **Disable** "Cognito-assisted verification and confirmation"
4. **Enable** "Self-service account recovery"

### 2. Configure Email Settings

1. Go to "Messaging" → "Email configuration"
2. Choose your email provider (SES, Cognito default, or custom)
3. Configure email templates if desired

### 3. Email Template Customization (Optional)

You can customize the verification email template:

1. Go to "Messaging" → "Email templates"
2. Select "Verification message"
3. Customize:
   - **Subject**: "Verify your FindPlayer account"
   - **Message**: Include your app branding and clear instructions

## Deployment Steps

### 1. Deploy Backend Functions

```bash
# Deploy the new Lambda functions
cd backend/lambda-packages/confirm-signup
npm install
zip -r confirm-signup.zip .
# Upload to AWS Lambda

cd ../resend-confirmation
npm install
zip -r resend-confirmation.zip .
# Upload to AWS Lambda
```

### 2. Update API Gateway

Add new endpoints to your API Gateway:

#### Confirm Signup Endpoint
- **Resource**: `/confirm-signup`
- **Method**: POST
- **Integration**: Lambda function (confirm-signup)
- **CORS**: Enable

#### Resend Confirmation Endpoint
- **Resource**: `/resend-confirmation`
- **Method**: POST
- **Integration**: Lambda function (resend-confirmation)
- **CORS**: Enable

### 3. Environment Variables

Ensure these environment variables are set in your Lambda functions:

```bash
REGION=us-east-1
CLIENT_ID=your-cognito-client-id
USER_POOL_ID=your-cognito-user-pool-id
```

### 4. Deploy Frontend

```bash
cd frontend
npm run build
# Deploy to your hosting platform
```

## Testing the Workflow

### 1. Test Signup Flow

1. Go to `/signup`
2. Fill out the form and submit
3. Should redirect to `/verify-email` with email in state
4. Check email for verification code

### 2. Test Verification Flow

1. Enter the 6-digit code from email
2. Click "Verify Email"
3. Should show success message and redirect to login

### 3. Test Resend Flow

1. Click "Resend Code"
2. Should receive new verification email
3. Use new code to verify

### 4. Test Login After Verification

1. Go to `/login`
2. Use the same email/password from signup
3. Should successfully log in

## Troubleshooting

### Common Issues

1. **"UserNotConfirmedException" on login**
   - User hasn't verified their email yet
   - Direct them to verification page

2. **"CodeMismatchException"**
   - Wrong or expired verification code
   - Use resend functionality

3. **"ExpiredCodeException"**
   - Verification code has expired (24 hours)
   - Request new code

4. **Email not received**
   - Check spam folder
   - Verify email address is correct
   - Check Cognito email configuration

### Debug Steps

1. Check CloudWatch logs for Lambda functions
2. Verify API Gateway endpoints are correctly configured
3. Ensure CORS headers are set properly
4. Check Cognito User Pool settings

## Security Considerations

1. **Rate Limiting**: Cognito automatically rate-limits verification code requests
2. **Code Expiration**: Verification codes expire after 24 hours
3. **Token Verification**: Enhanced verify-auth function properly validates JWT tokens
4. **CORS**: All endpoints include proper CORS headers

## Rollback Plan

If you need to revert to auto-confirmation:

1. Re-enable "Cognito-assisted verification and confirmation" in Cognito
2. Revert signup function to include auto-login
3. Remove verification page from routing
4. Update signup forms to handle auto-login response

## Benefits of This Implementation

1. **Security**: Ensures email ownership before account activation
2. **User Experience**: Clear, intuitive verification flow
3. **Reliability**: Uses AWS Cognito's battle-tested email system
4. **Maintainability**: Clean separation of concerns
5. **Scalability**: Leverages AWS infrastructure

## Next Steps

1. Deploy the backend changes
2. Configure Cognito settings
3. Deploy frontend changes
4. Test the complete workflow
5. Monitor for any issues
6. Consider adding email templates for better branding 