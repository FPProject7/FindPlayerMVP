// backend/_test_reset_password.js

import { handler } from '../functions/reset-password.js';

const mockEvent = {
  body: JSON.stringify({
    email: "jad.n.eid@gmail.com",
    confirmationCode: "748814", // <-- Paste the code from your email here
    password: "NewPassword456!", // <-- The new password you want to set
  })
};

const testResetPassword = async () => {
  console.log("--- Testing Reset Password Function ---");
  try {
    const response = await handler(mockEvent);
    console.log("--- Cognito Response ---");
    console.log(response);
  } catch (error) {
    console.error("--- Function Errored ---", error);
  }
};

testResetPassword();