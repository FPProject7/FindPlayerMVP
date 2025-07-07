#!/bin/bash
# Deploy all Events Lambda functions

set -e

REGION=${AWS_REGION:-us-east-1}
ROLE_NAME="findplayer-events-lambda-role"
ROLE_ARN="arn:aws:iam::325298451465:role/$ROLE_NAME"

LAMBDA_NAMES=(
  create-event
  list-events
  get-event
  register-for-event
  deregister-from-event
  list-my-hosted-events
  list-my-registered-events
  list-registered-players
  generate-event-image-url
  stripe-webhook
)

for NAME in "${LAMBDA_NAMES[@]}"; do
  echo "Packaging $NAME..."
  cd $NAME
  zip -r ../$NAME.zip .
  cd ..
  echo "Deleting $NAME if it exists..."
  aws lambda delete-function \
    --function-name findplayer-$NAME \
    --region $REGION 2>/dev/null || true
  echo "Deploying $NAME..."
  aws lambda create-function \
    --function-name findplayer-$NAME \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://$NAME.zip \
    --timeout 15 \
    --memory-size 256 \
    --environment 'Variables={EVENTS_TABLE=findplayer-events,REGISTRATIONS_TABLE=findplayer-event-registrations,HOST_USER_GSI=hostUserId-index,USER_GSI=userId-index,EVENT_GSI=eventId-index,COGNITO_USER_POOL_ID=us-east-1_tS8a52861,EVENT_IMAGES_BUCKET=findplayer-event-images-325298451465}' \
    --region $REGION
  rm $NAME.zip
done

echo "Lambdas deployed."

# NOTE: Attach least-privilege IAM policies to $ROLE_ARN for DynamoDB and (for stripe-webhook) Stripe secrets.
# NOTE: Map each Lambda to API Gateway resources/methods as described in README. 