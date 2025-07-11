import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { gql } from '@apollo/client';
import client from './apolloClient';

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

// Track profile view and create notifications
export const trackProfileView = async (viewedUserId) => {
  const token = await useAuthStore.getState().getValidToken();
  
  try {
    const response = await axios.post('https://3emgvv0wwc.execute-api.us-east-1.amazonaws.com/trackProfileView', { 
      viewedUserId 
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response;
  } catch (error) {
    console.error('trackProfileView error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
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

// Get user info by userId
export const getUserInfo = async (userId) => {
  try {
    const response = await getInfoUser(userId);
    return response.data;
  } catch (error) {
    console.error('Error fetching user info:', error);
    // Return fallback data if user not found
    return {
      id: userId,
      name: `User ${userId.slice(0, 6)}`,
      profilePictureUrl: null
    };
  }
};

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      email
      profile_picture_url
      role
    }
  }
`;

export async function searchUsers(query) {
  const { data } = await client.query({
    query: SEARCH_USERS,
    variables: { query },
    fetchPolicy: 'network-only',
  });
  return data?.searchUsers || [];
}

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($otherUserId: ID!) {
    createConversation(otherUserId: $otherUserId) {
      conversationId
      participant1
      participant2
      participant1Name
      participant2Name
      lastMessageContent
      lastMessageTimestamp
      unreadCount
      createdAt
      updatedAt
    }
  }
`;

export async function createConversation(otherUserId) {
  const { data } = await client.mutate({
    mutation: CREATE_CONVERSATION,
    variables: { otherUserId },
    fetchPolicy: 'no-cache',
  });
  return data?.createConversation;
}

// Function to get leaderboard data (without streaks)
export const getLeaderboard = async (filters = {}) => {
  const token = await useAuthStore.getState().getValidToken();
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
  if (filters.gender) params.append('gender', filters.gender);
  return axios.get(`https://bnqn7px198.execute-api.us-east-1.amazonaws.com/prod/leaderboard?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Function to get leaderboard data WITH streaks
export const getLeaderboardWithStreak = async (filters = {}) => {
  const token = await useAuthStore.getState().getValidToken();
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
  if (filters.gender) params.append('gender', filters.gender);
  return axios.get(`https://bnout0gpv5.execute-api.us-east-1.amazonaws.com/getLeaderboardWithStreaks?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Update updateStreak to use the correct endpoint
export const updateStreak = async (userId) => {
  const token = await useAuthStore.getState().getValidToken();
  try {
    const response = await axios.post(
      'https://bnout0gpv5.execute-api.us-east-1.amazonaws.com/updateStreak',
      { userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('updateStreak error:', error);
    throw error;
  }
};

// Update user status (verification and premium)
export const updateUserStatus = async (statusData) => {
  try {
    const response = await axios.post(
      'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default/update-user-status',
      statusData,
      {
        headers: {
          'Authorization': `Bearer ${await useAuthStore.getState().getValidToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};
