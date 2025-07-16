# Stripe Webhook Handler Lambda

This Lambda function handles Stripe webhook events for subscription payments.

## Environment Variables
- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_...`).
- `STRIPE_WEBHOOK_SECRET`: The webhook signing secret from your Stripe dashboard.

## Deployment
- Deploy this Lambda to AWS Lambda.
- Connect it to an API Gateway endpoint (e.g., POST `/api/stripe-webhook`).
- In your Stripe dashboard, add this endpoint as a webhook and subscribe to `checkout.session.completed` events (and others as needed).

## Usage
- Stripe will POST events to this endpoint.
- The Lambda verifies the event and, on `checkout.session.completed`, extracts the `userId` from the session metadata.
- **TODO:** Update your user database to set premium status for the user.

## Notes
- Make sure your endpoint is accessible by Stripe (public URL).
- Test with Stripe CLI or dashboard. 