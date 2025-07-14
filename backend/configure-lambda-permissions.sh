#!/bin/bash

# Lambda Function Permissions Configuration Script
# This script helps you manually configure IAM roles and policies for your Lambda functions

set -e

# Configuration variables - UPDATE THESE WITH YOUR VALUES
REGION="us-east-1"  # Change to your AWS region
USER_POOL_ID="your-cognito-user-pool-id"  # Replace with your Cognito User Pool ID
S3_BUCKET_NAME="findplayer-post-images"  # Your S3 bucket for uploads
DYNAMODB_TABLE="your-dynamodb-table-name"  # Replace with your DynamoDB table name

echo "🔧 Lambda Function Permissions Configuration"
echo "============================================="
echo ""

# 1. Create IAM Role for Google Auth Lambda Functions
echo "1. Creating IAM Role for Google Auth Lambda Functions..."
echo ""

# Create the trust policy for Lambda
cat > google-auth-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name GoogleAuthLambdaRole \
  --assume-role-policy-document file://google-auth-trust-policy.json \
  --description "IAM role for Google Auth Lambda functions" \
  --region $REGION

# 2. Create IAM Policy for Google Auth Functions
echo "2. Creating IAM Policy for Google Auth Functions..."
echo ""

cat > google-auth-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:AdminConfirmSignUp",
        "cognito-idp:AdminDeleteUser"
      ],
      "Resource": "arn:aws:cognito-idp:${REGION}:*:userpool/${USER_POOL_ID}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET_NAME}",
        "arn:aws:s3:::${S3_BUCKET_NAME}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}",
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}/index/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name GoogleAuthLambdaPolicy \
  --policy-document file://google-auth-policy.json \
  --description "Policy for Google Auth Lambda functions" \
  --region $REGION

# Attach policy to role
aws iam attach-role-policy \
  --role-name GoogleAuthLambdaRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/GoogleAuthLambdaPolicy \
  --region $REGION

# 3. Create IAM Role for General Lambda Functions
echo "3. Creating IAM Role for General Lambda Functions..."
echo ""

# Create the trust policy for Lambda
cat > general-lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name GeneralLambdaRole \
  --assume-role-policy-document file://general-lambda-trust-policy.json \
  --description "IAM role for general Lambda functions" \
  --region $REGION

# 4. Create IAM Policy for General Functions
echo "4. Creating IAM Policy for General Functions..."
echo ""

cat > general-lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUser"
      ],
      "Resource": "arn:aws:cognito-idp:${REGION}:*:userpool/${USER_POOL_ID}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET_NAME}",
        "arn:aws:s3:::${S3_BUCKET_NAME}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}",
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}/index/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name GeneralLambdaPolicy \
  --policy-document file://general-lambda-policy.json \
  --description "Policy for general Lambda functions" \
  --region $REGION

# Attach policy to role
aws iam attach-role-policy \
  --role-name GeneralLambdaRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/GeneralLambdaPolicy \
  --region $REGION

# 5. Create IAM Role for Event Lambda Functions
echo "5. Creating IAM Role for Event Lambda Functions..."
echo ""

# Create the trust policy for Lambda
cat > event-lambda-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name EventLambdaRole \
  --assume-role-policy-document file://event-lambda-trust-policy.json \
  --description "IAM role for event Lambda functions" \
  --region $REGION

# 6. Create IAM Policy for Event Functions
echo "6. Creating IAM Policy for Event Functions..."
echo ""

cat > event-lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes"
      ],
      "Resource": "arn:aws:cognito-idp:${REGION}:*:userpool/${USER_POOL_ID}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}",
        "arn:aws:dynamodb:${REGION}:*:table/${DYNAMODB_TABLE}/index/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name EventLambdaPolicy \
  --policy-document file://event-lambda-policy.json \
  --description "Policy for event Lambda functions" \
  --region $REGION

# Attach policy to role
aws iam attach-role-policy \
  --role-name EventLambdaRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/EventLambdaPolicy \
  --region $REGION

# 7. Clean up temporary files
echo "7. Cleaning up temporary files..."
rm -f google-auth-trust-policy.json google-auth-policy.json
rm -f general-lambda-trust-policy.json general-lambda-policy.json
rm -f event-lambda-trust-policy.json event-lambda-policy.json

echo ""
echo "✅ IAM Roles and Policies Created Successfully!"
echo ""
echo "📋 Summary of Created Resources:"
echo "================================"
echo "• GoogleAuthLambdaRole - For Google authentication functions"
echo "• GeneralLambdaRole - For general functions (signup, signin, etc.)"
echo "• EventLambdaRole - For event-related functions"
echo ""
echo "🔗 Role ARNs:"
echo "============="
echo "GoogleAuthLambdaRole: arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/GoogleAuthLambdaRole"
echo "GeneralLambdaRole: arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/GeneralLambdaRole"
echo "EventLambdaRole: arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/EventLambdaRole"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Update your Lambda functions to use these roles"
echo "2. Set the appropriate environment variables"
echo "3. Test the functions to ensure permissions work correctly"
echo ""
echo "💡 To update a Lambda function's role:"
echo "aws lambda update-function-configuration \\"
echo "  --function-name YOUR_FUNCTION_NAME \\"
echo "  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ROLE_NAME \\"
echo "  --region $REGION" 