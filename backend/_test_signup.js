import { handler } from './functions/signup.js';

// This mock event simulates what API Gateway will send to your function.
// The 'body' must be a JSON string.
const mockEvent = {
  body: JSON.stringify({
    email: "test@findplayer.app",
    password: "SecurePassword123!",
    role: "Athlete",
    firstName: "Jad"
  })
};

const testSignup = async () => {
  console.log("--- Testing Sign-Up Function ---");
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