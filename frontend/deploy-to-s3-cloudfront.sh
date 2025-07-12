#!/bin/bash

# Exit on error
set -e

# Hardcoded values
S3_BUCKET="findplayer-web-app-1752319778"
CLOUDFRONT_DISTRIBUTION_ID="E1FQ90EV0M5HZD"

# Build the frontend
npm ci
npm run build

# Sync build to S3
aws s3 sync dist/ s3://$S3_BUCKET --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths '/*'

echo "Deployment complete!" 