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

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

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
      // If token refresh fails, let the request fail naturally
      console.error('[Axios] Failed to get valid token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for main API client
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await useAuthStore.getState().refreshTokenAsync();
        const token = await useAuthStore.getState().getValidToken();
        
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        
        processQueue(null, token);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout(true); // Mark as session expired
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
      console.error('[Axios Events] Failed to get valid ID token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for events API client
eventsApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return eventsApiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await useAuthStore.getState().refreshTokenAsync();
        const token = await useAuthStore.getState().getValidIdToken();
        
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        
        processQueue(null, token);
        return eventsApiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout(true); // Mark as session expired
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { eventsApiClient };