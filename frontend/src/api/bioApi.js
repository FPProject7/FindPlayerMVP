// frontend/src/api/bioApi.js

import axios from 'axios';

// Create a separate API client specifically for bio functions
const bioApiClient = axios.create({
  baseURL: 'https://o6qnyipee0.execute-api.us-east-1.amazonaws.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Get user bio
export const getUserBio = async (userId) => {
  try {
    const response = await bioApiClient.get(`/get-user-bio?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user bio:', error);
    throw error;
  }
};

// Update user bio
export const updateUserBio = async (userId, bio) => {
  try {
    const response = await bioApiClient.post('/update-user-bio', { 
      userId,
      bio 
    });
    return response.data;
  } catch (error) {
    console.error('Error updating user bio:', error);
    throw error;
  }
}; 