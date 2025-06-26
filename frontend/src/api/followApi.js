import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const followApiClient = axios.create({
  baseURL: 'https://6kz5vicmgj.execute-api.us-east-1.amazonaws.com',
});

followApiClient.interceptors.request.use(
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

export const followUser = (followerId, followingId) => {
  return followApiClient.post('/follow', { followerId, followingId });
};

export const unfollowUser = (followerId, followingId) => {
  return followApiClient.post('/unfollow', { followerId, followingId });
};

export const checkFollowing = (followerId, followingId) => {
  return followApiClient.get(`/check`, {
    params: { followerId, followingId }
  });
};

export const getNotifications = () => {
  return followApiClient.get('/notifications');
};
