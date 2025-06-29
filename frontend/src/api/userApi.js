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

const PUBLIC_USER_INFO_URL = 'https://k4hvzprd1g.execute-api.us-east-1.amazonaws.com/default/getInfoUser';

export const getInfoUser = (userId, username) => {
  const params = {};
  if (userId) params.userId = userId;
  if (username) params.username = username;
  // Use public endpoint if looking up by userId or username (public profile)
  if (userId || username) {
    return axios.get(PUBLIC_USER_INFO_URL, { params });
  }
  // Otherwise, use the authenticated endpoint for 'me' lookups
  return userApiClient.get('/user-info', { params });
};

export { connectionsApiClient };

const PUBLIC_CONNECTIONS_URL = 'https://6gsow5ouw8.execute-api.us-east-1.amazonaws.com/default/getConnections';

// Fetch follower count for a user (uses connections client)
export const getFollowerCount = (userId) => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  const params = {
    userId,
    countsOnly: true
  };
  if (!isAuthenticated) {
    // Use public endpoint for unauthenticated users
    return axios.get(PUBLIC_CONNECTIONS_URL, { params })
      .then(res => res.data.followerCount);
  }
  // Use original endpoint for authenticated users
  return connectionsApiClient.get('/connections', { params })
    .then(res => res.data.followerCount);
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

// Function to get leaderboard data
export const getLeaderboard = (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.heightMin !== undefined) params.append('heightMin', filters.heightMin);
  if (filters.heightMax !== undefined) params.append('heightMax', filters.heightMax);
  if (filters.country) params.append('country', filters.country);
  if (filters.sport) params.append('sport', filters.sport);
  if (filters.position) params.append('position', filters.position);
  if (filters.ageMin) params.append('ageMin', filters.ageMin);
  if (filters.ageMax) params.append('ageMax', filters.ageMax);
  if (filters.timeFrame) params.append('timeFrame', filters.timeFrame);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  if (filters.role) params.append('role', filters.role);
  
  return userApiClient.get(`/leaderboard?${params.toString()}`);
};
