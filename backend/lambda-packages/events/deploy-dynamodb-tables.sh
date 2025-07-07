#!/bin/bash
# Deploy DynamoDB tables for Events feature

set -e

REGION=${AWS_REGION:-us-east-1}

# Create findplayer-events table
aws dynamodb create-table \
  --table-name findplayer-events \
  --attribute-definitions AttributeName=eventId,AttributeType=S AttributeName=hostUserId,AttributeType=S \
  --key-schema AttributeName=eventId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --global-secondary-indexes '[{"IndexName":"hostUserId-index","KeySchema":[{"AttributeName":"hostUserId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
  --region $REGION 2>/dev/null || echo "findplayer-events table already exists."

# Create findplayer-event-registrations table
aws dynamodb create-table \
  --table-name findplayer-event-registrations \
  --attribute-definitions AttributeName=registrationId,AttributeType=S AttributeName=userId,AttributeType=S AttributeName=eventId,AttributeType=S \
  --key-schema AttributeName=registrationId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --global-secondary-indexes '[{"IndexName":"userId-index","KeySchema":[{"AttributeName":"userId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}, {"IndexName":"eventId-index","KeySchema":[{"AttributeName":"eventId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
  --region $REGION 2>/dev/null || echo "findplayer-event-registrations table already exists."

echo "DynamoDB tables deployed." 