#!/bin/bash

# Google Auth Lambda Functions Deployment Script
echo "🚀 Starting Google Auth Lambda deployment..."

# Check if we're in the right directory
if [ ! -d "lambda-packages/google-auth" ]; then
    echo "ERROR: Please run this script from the backend directory"
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="google-auth-deployment"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "Installing dependencies..."
cd lambda-packages/google-auth
npm install

# Package functions
echo "Packaging functions..."

# Package google-signin
zip -r ../../$DEPLOY_DIR/google-signin.zip google-signin.js package.json package-lock.json node_modules/

# Package google-callback  
zip -r ../../$DEPLOY_DIR/google-callback.zip google-callback.js package.json package-lock.json node_modules/

# Package complete-profile
zip -r ../../$DEPLOY_DIR/complete-profile.zip complete-profile.js package.json package-lock.json node_modules/

cd ../..

echo "✅ Packages created in $DEPLOY_DIR/"
echo ""
echo "Next steps:"
echo "1. Upload zip files to AWS Lambda"
echo "2. Set environment variables"
echo "3. Create API Gateway endpoints"
echo "4. Configure CORS" 