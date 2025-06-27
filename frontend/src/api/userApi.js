import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

// Client for XP/user info endpoints
const userApiClient = axios.create({
  baseURL: 'https://o6qnyipee0.execute-api.us-east-1.amazonaws.com',
});

// Client for connections endpoint
const connectionsApiClient = axios.create({
  baseURL: 'https://6kz5vicmgj.execute-api.us-east-1.amazonaws.com',
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

// Use the same interceptor for connections client (if needed)
connectionsApiClient.interceptors.request.use(
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

export { connectionsApiClient };

// Fetch follower count for a user (uses connections client)
export const getFollowerCount = (userId) => {
  return connectionsApiClient.get('/connections', {
    params: {
      userId,
      countsOnly: true
    }
  }).then(res => res.data.followerCount);
};

// Function to award XP points (for testing and future use)
export const awardXP = (userId, challengeId, submissionId, points, earnedFor) => {
  return userApiClient.post('/award-experience-points', {
    userId,
    challengeId,
    submissionId,
    points,
    earnedFor
  });
};
