// frontend/src/api/axiosConfig.js

import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// Create a new Axios instance
const apiClient = axios.create({
  // You will replace this with your actual API Gateway URL from the DevOps engineer
  baseURL: 'https://iaulcttcsl.execute-api.us-east-1.amazonaws.com',
});

// This is the interceptor. It runs before every single request.
apiClient.interceptors.request.use(
  (config) => {
    // Get the token from our Zustand auth store
    const token = useAuthStore.getState().token;

    // If a token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle any request errors
    return Promise.reject(error);
  }
);

export default apiClient;