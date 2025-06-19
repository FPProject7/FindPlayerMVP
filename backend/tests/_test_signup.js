// backend/_test_signup.js

import { handler } from '../functions/signup.js';

const mockEvent = {
  body: JSON.stringify({
    email: "new-test-athlete-2@findplayer.app",
    password: "SecurePassword12Jad!",
    role: "Athlete",
    firstName: "Jad Test",
    gender: "Male",
    sport: "Basketball",
    position: "Point Guard"
  })
};

const testSignup = async () => {
  console.log("--- Testing Full Sign-Up Function ---");
  try {
    const response = await handler(mockEvent);
    console.log("--- Cognito Response ---");
    console.log(response);
  } catch (error) {
    console.error("--- Function Errored ---");
    console.error(error);
  }
};

testSignup();