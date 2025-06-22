// backend/_test_signin.js

import { handler } from '../functions/signin.js';

const mockEvent = {
  body: JSON.stringify({
    email: "ejad.home@gmail.com", // Use the email of the user you just created
    password: "P@ssword123",       // Use the correct password
  })
};

const testSignin = async () => {
  console.log("--- Testing Sign-In Function ---");
  try {
    const response = await handler(mockEvent);
    console.log("--- Cognito Response ---");
    // For readability, let's parse the body if the request was successful
    if (response.statusCode === 200) {
        response.body = JSON.parse(response.body);
    }
    console.log(response);
  } catch (error) {
    console.error("--- Function Errored ---");
    console.error(error);
  }
};

testSignin();