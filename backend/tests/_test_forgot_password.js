// backend/_test_forgot_password.js

import { handler } from '../functions/forgot-password.js';

const mockEvent = {
  body: JSON.stringify({
    email: "jad.n.eid@gmail.com" // Use an existing, confirmed user's email
  })
};

const testForgotPassword = async () => {
  console.log("--- Testing Forgot Password Function ---");
  try {
    const response = await handler(mockEvent);
    console.log("--- Cognito Response ---");
    console.log(response);
  } catch (error) {
    console.error("--- Function Errored ---", error);
  }
};

testForgotPassword();