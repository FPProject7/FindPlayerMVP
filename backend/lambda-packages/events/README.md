# Events Lambda Package

This directory contains all Lambda functions and related code for the Events feature of FindPlayerMVP.

## Structure
- `create-event/` - Lambda for creating new events
- `list-events/` - Lambda for listing/searching events
- `get-event/` - Lambda for fetching event details
- `register-for-event/` - Lambda for registering a user for an event
- `deregister-from-event/` - Lambda for deregistering a user from an event
- `list-my-hosted-events/` - Lambda for listing events hosted by the current user
- `list-my-registered-events/` - Lambda for listing events the user is registered for
- `list-registered-players/` - Lambda for listing players registered for an event
- `stripe-webhook/` - Lambda for handling Stripe payment webhooks (stub for now)

## DynamoDB Tables
- `findplayer-events`
  - PK: `eventId` (string, UUID)
  - GSI: `hostUserId-index` (hostUserId as partition key)
- `findplayer-event-registrations`
  - PK: `registrationId` (string, UUID)
  - GSI: `userId-index` (userId as partition key)
  - GSI: `eventId-index` (eventId as partition key)

## Environment Variables
- `EVENTS_TABLE` (default: findplayer-events)
- `REGISTRATIONS_TABLE` (default: findplayer-event-registrations)
- `HOST_USER_GSI` (default: hostUserId-index)
- `USER_GSI` (default: userId-index)
- `EVENT_GSI` (default: eventId-index)
- `STRIPE_SECRET_KEY` (for stripe-webhook only)

## API Gateway
All endpoints are mapped under the main API Gateway REST API (`findplayermvp-community-feed-api`).
- Each Lambda is mapped to a REST resource and method (see deployment notes).

## Auth
All endpoints require Cognito JWT authentication (except Stripe webhook).

## IAM
Each Lambda should have least-privilege access to only the tables and actions it needs (see deployment scripts).

## Deployment
- Add new DynamoDB tables and GSIs if not present.
- Deploy each Lambda as a separate AWS Lambda function.
- Map each Lambda to the appropriate API Gateway resource/method.
- Set environment variables for each Lambda.
- Update IAM roles/policies for least-privilege access. 