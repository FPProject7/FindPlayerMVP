# SubscribeButton Component

This component lets users select their plan and start a Stripe subscription.

## Usage

1. **Import the component:**
   ```jsx
   import SubscribeButton from './SubscribeButton';
   ```

2. **Use in your page/component:**
   ```jsx
   <SubscribeButton userId={userId} />
   ```
   - `userId` is optional but recommended for tracking the user in your backend.

3. **Backend Endpoint:**
   - Expects a POST endpoint at `/api/stripe-create-checkout-session` that returns `{ url }` for Stripe Checkout.

4. **Redirect:**
   - On success, the user is redirected to Stripe Checkout. 