#!/bin/bash
# Deploy API Gateway resources and methods for Events feature

set -e

REGION=${AWS_REGION:-us-east-1}
COGNITO_USER_POOL_ID=us-east-1_tS8a52861
COGNITO_PROVIDER_ARN="arn:aws:cognito-idp:$REGION:325298451465:userpool/$COGNITO_USER_POOL_ID"

echo "Creating new API Gateway REST API for Events..."
API_RESPONSE=$(aws apigateway create-rest-api \
  --name findplayermvp-events-api \
  --description "Events API for FindPlayerMVP" \
  --region $REGION)

API_ID=$(echo $API_RESPONSE | jq -r '.id')
echo "Created API Gateway with ID: $API_ID"

# Get the root resource ID
ROOT_RESOURCE_RESPONSE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION)
ROOT_RESOURCE_ID=$(echo $ROOT_RESOURCE_RESPONSE | jq -r '.items[0].id')

echo "Creating Cognito Authorizer..."
AUTHORIZER_RESPONSE=$(aws apigateway create-authorizer \
  --rest-api-id $API_ID \
  --name EventsCognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns '["'$COGNITO_PROVIDER_ARN'"]' \
  --identity-source 'method.request.header.Authorization' \
  --region $REGION)

AUTHORIZER_ID=$(echo $AUTHORIZER_RESPONSE | jq -r '.id')
echo "Created Cognito Authorizer with ID: $AUTHORIZER_ID"

# Create /events resource
echo "Creating /events resource..."
EVENTS_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part events \
  --region $REGION)

EVENTS_RESOURCE_ID=$(echo $EVENTS_RESOURCE_RESPONSE | jq -r '.id')

# Create POST /events (create-event)
echo "Creating POST /events method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $EVENTS_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $EVENTS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-create-event/invocations \
  --region $REGION

# Create GET /events (list-events)
echo "Creating GET /events method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $EVENTS_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $EVENTS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-list-events/invocations \
  --region $REGION

# Create /events/image-upload resource
echo "Creating /events/image-upload resource..."
IMAGE_UPLOAD_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $EVENTS_RESOURCE_ID \
  --path-part image-upload \
  --region $REGION)

IMAGE_UPLOAD_RESOURCE_ID=$(echo $IMAGE_UPLOAD_RESOURCE_RESPONSE | jq -r '.id')

# Create POST /events/image-upload (generate-event-image-url)
echo "Creating POST /events/image-upload method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $IMAGE_UPLOAD_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $IMAGE_UPLOAD_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-generate-event-image-url/invocations \
  --region $REGION

# Create /events/{eventId} resource
echo "Creating /events/{eventId} resource..."
EVENT_DETAIL_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $EVENTS_RESOURCE_ID \
  --path-part "{eventId}" \
  --region $REGION)

EVENT_DETAIL_RESOURCE_ID=$(echo $EVENT_DETAIL_RESOURCE_RESPONSE | jq -r '.id')

# Create GET /events/{eventId} (get-event)
echo "Creating GET /events/{eventId} method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $EVENT_DETAIL_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $EVENT_DETAIL_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-get-event/invocations \
  --region $REGION

# Create /events/{eventId}/register resource
echo "Creating /events/{eventId}/register resource..."
REGISTER_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $EVENT_DETAIL_RESOURCE_ID \
  --path-part register \
  --region $REGION)

REGISTER_RESOURCE_ID=$(echo $REGISTER_RESOURCE_RESPONSE | jq -r '.id')

# Create POST /events/{eventId}/register (register-for-event)
echo "Creating POST /events/{eventId}/register method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-register-for-event/invocations \
  --region $REGION

# Create DELETE /events/{eventId}/register (deregister-from-event)
echo "Creating DELETE /events/{eventId}/register method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method DELETE \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method DELETE \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-deregister-from-event/invocations \
  --region $REGION

# Create /events/{eventId}/players resource
echo "Creating /events/{eventId}/players resource..."
PLAYERS_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $EVENT_DETAIL_RESOURCE_ID \
  --path-part players \
  --region $REGION)

PLAYERS_RESOURCE_ID=$(echo $PLAYERS_RESOURCE_RESPONSE | jq -r '.id')

# Create GET /events/{eventId}/players (list-registered-players)
echo "Creating GET /events/{eventId}/players method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $PLAYERS_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $PLAYERS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-list-registered-players/invocations \
  --region $REGION

# Create /my-events resource
echo "Creating /my-events resource..."
MY_EVENTS_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part my-events \
  --region $REGION)

MY_EVENTS_RESOURCE_ID=$(echo $MY_EVENTS_RESOURCE_RESPONSE | jq -r '.id')

# Create GET /my-events/hosted (list-my-hosted-events)
echo "Creating /my-events/hosted resource..."
HOSTED_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $MY_EVENTS_RESOURCE_ID \
  --path-part hosted \
  --region $REGION)

HOSTED_RESOURCE_ID=$(echo $HOSTED_RESOURCE_RESPONSE | jq -r '.id')

echo "Creating GET /my-events/hosted method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $HOSTED_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $HOSTED_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-list-my-hosted-events/invocations \
  --region $REGION

# Create GET /my-events/registered (list-my-registered-events)
echo "Creating /my-events/registered resource..."
REGISTERED_RESOURCE_RESPONSE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $MY_EVENTS_RESOURCE_ID \
  --path-part registered \
  --region $REGION)

REGISTERED_RESOURCE_ID=$(echo $REGISTERED_RESOURCE_RESPONSE | jq -r '.id')

echo "Creating GET /my-events/registered method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $REGISTERED_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --region $REGION

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $REGISTERED_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:325298451465:function:findplayer-list-my-registered-events/invocations \
  --region $REGION

# Deploy the API
echo "Deploying API Gateway..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION

echo "API Gateway deployed successfully!"
echo "API ID: $API_ID"
echo "Base URL: https://$API_ID.execute-api.$REGION.amazonaws.com/prod" 