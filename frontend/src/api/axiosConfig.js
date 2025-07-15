// frontend/src/api/axiosConfig.js

import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// Main API client for auth, feed, etc.
const apiClient = axios.create({
  baseURL: 'https://iaulcttcsl.execute-api.us-east-1.amazonaws.com', // original API Gateway for non-events
});

// Events API client (use ONLY for events)
const eventsApiClient = axios.create({
  baseURL: 'https://frf2mofcw1.execute-api.us-east-1.amazonaws.com/prod', // events API Gateway
});

// Request interceptor for main API client
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get a valid token (will refresh if needed)
      const token = await useAuthStore.getState().getValidToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Let the request fail naturally
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for main API client
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await useAuthStore.getState().refreshTokenAsync();
        const originalRequest = error.config;
        const token = await useAuthStore.getState().getValidToken();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout(true); // Mark as session expired
      }
    }
    return Promise.reject(error);
  }
);

// Request interceptor for events API client
// Use ID token for event endpoints
eventsApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await useAuthStore.getState().getValidIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Let the request fail naturally
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for events API client
eventsApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await useAuthStore.getState().refreshTokenAsync();
        const originalRequest = error.config;
        const token = await useAuthStore.getState().getValidIdToken();
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return eventsApiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout(true); // Mark as session expired
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { eventsApiClient };