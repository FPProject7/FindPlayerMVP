// frontend/src/api/axiosConfig.js

import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// Create a new Axios instance
const apiClient = axios.create({
  // You will replace this with your actual API Gateway URL from the DevOps engineer
  baseURL: 'https://iaulcttcsl.execute-api.us-east-1.amazonaws.com',
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get a valid token (will refresh if needed)
      const token = await useAuthStore.getState().getValidToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Don't throw here, let the request fail naturally
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const newToken = await useAuthStore.getState().refreshToken();
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        // BUT don't redirect if this is already a login request
        if (!originalRequest.url?.includes('/signin') && !originalRequest.url?.includes('/login')) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;