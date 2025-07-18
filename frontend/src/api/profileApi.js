// frontend/src/api/profileApi.js

import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// Create a separate API client specifically for profile functions
const profileApiClient = axios.create({
  baseURL: 'https://o6qnyipee0.execute-api.us-east-1.amazonaws.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update profile picture
export const updateProfilePicture = async (profilePictureBase64, profilePictureContentType) => {
  try {
    const token = await useAuthStore.getState().getValidToken();
    const user = useAuthStore.getState().user;
    
    const response = await profileApiClient.post('/update-profile-picture', {
      profilePictureBase64,
      profilePictureContentType,
      userId: user?.id // Include userId as fallback
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw error;
  }
}; 