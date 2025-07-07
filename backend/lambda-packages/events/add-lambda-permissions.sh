#!/bin/bash

API_ID="frf2mofcw1"
REGION="us-east-1"
STAGE="prod"

# CORS headers
ALLOWED_ORIGIN="*"
ALLOWED_METHODS="GET,POST,PUT,DELETE,OPTIONS"
ALLOWED_HEADERS="Content-Type,Authorization"

# 1. Get all resources
RESOURCE_IDS=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[].id' --output text)

for RESOURCE_ID in $RESOURCE_IDS; do
  echo "Processing resource: $RESOURCE_ID"

  # 2. Add/Update OPTIONS method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type "NONE" \
    --region $REGION || true

  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
    --region $REGION || true

  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-models '{"application/json":"Empty"}' \
    --region $REGION || true

  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-templates '{"application/json":""}' \
    --response-parameters "method.response.header.Access-Control-Allow-Origin='${ALLOWED_ORIGIN}'" \
    --region $REGION || true

  # 3. Add CORS headers to all existing methods (GET, POST, etc.)
  for METHOD in GET POST PUT DELETE; do
    # Check if method exists
    aws apigateway get-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method $METHOD \
      --region $REGION > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "Adding CORS headers to $METHOD on $RESOURCE_ID"
      aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method $METHOD \
        --status-code 200 \
        --response-models '{"application/json":"Empty"}' \
        --region $REGION || true

      aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method $METHOD \
        --status-code 200 \
        --response-templates '{"application/json":""}' \
        --response-parameters "method.response.header.Access-Control-Allow-Origin='${ALLOWED_ORIGIN}'" \
        --region $REGION || true
    fi
  done
done

# 4. Deploy the API
echo "Deploying API to stage $STAGE..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE \
  --region $REGION

echo "✅ CORS configuration applied to all resources and methods!"