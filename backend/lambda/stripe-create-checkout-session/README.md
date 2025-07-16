# Stripe Create Checkout Session Lambda

This Lambda function creates a Stripe Checkout Session for premium subscriptions.

## Environment Variables
- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_...`).

## Deployment
- Deploy this Lambda to AWS Lambda.
- Connect it to an API Gateway endpoint (e.g., POST `/api/stripe-create-checkout-session`).

## Usage
- **POST** to the endpoint with JSON body:
  ```json
  {
    "userType": "athlete" | "coach" | "scout",
    "billingPeriod": "monthly" | "yearly",
    "userId": "<user-id>" // optional but recommended
  }
  ```
- Returns:
  ```json
  { "url": "<stripe_checkout_url>" }
  ```

## Notes
- Update `success_url` and `cancel_url` in `index.js` to point to your frontend.
- Make sure CORS is enabled if calling from frontend. 