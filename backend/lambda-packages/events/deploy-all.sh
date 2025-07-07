#!/bin/bash
# Master deployment script for Events feature

set -e

echo "🚀 Starting Events feature deployment..."

# Step 1: Create DynamoDB tables
echo "📊 Step 1: Creating DynamoDB tables..."
./deploy-dynamodb-tables.sh

# Step 2: Create IAM policy and attach to role
echo "🔐 Step 2: Setting up IAM permissions..."
POLICY_NAME="EventsDynamoDBPolicy"
ROLE_NAME="awardExperiencePoints-role-gguj0nzp"

# Create the policy
aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file://iam-policy.json \
  --region us-east-1 || echo "Policy already exists, updating..."

# Attach policy to the role
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::325298451465:policy/$POLICY_NAME || echo "Policy already attached."

# Step 3: Deploy Lambda functions
echo "⚡ Step 3: Deploying Lambda functions..."
./deploy-lambdas.sh

# Step 4: Deploy API Gateway
echo "🌐 Step 4: Deploying API Gateway..."
./deploy-apigateway.sh

echo "✅ Events feature deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "- DynamoDB tables: findplayer-events, findplayer-event-registrations"
echo "- Lambda functions: 9 event-related functions deployed"
echo "- API Gateway: New REST API created with Cognito authentication"
echo ""
echo "🔗 Next steps:"
echo "1. Test the API endpoints"
echo "2. Update frontend to use the new API"
echo "3. Configure CORS if needed" 