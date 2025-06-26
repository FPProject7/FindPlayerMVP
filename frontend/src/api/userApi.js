import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const userApiClient = axios.create({
  baseURL: 'https://o6qnyipee0.execute-api.us-east-1.amazonaws.com',
});

userApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await useAuthStore.getState().getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Don't throw, let the request fail naturally
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getInfoUser = (userId, username) => {
  const params = {};
  if (userId) params.userId = userId;
  if (username) params.username = username;
  return userApiClient.get('/user-info', { params });
};
