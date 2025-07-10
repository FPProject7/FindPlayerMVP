import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const postApiClient = axios.create({
  baseURL: 'https://36rrjiys1k.execute-api.us-east-1.amazonaws.com/prod',
});

postApiClient.interceptors.request.use(
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

// Create a new post
export const createPost = (userId, content, imageBase64 = null, imageContentType = null, videoBase64 = null, videoContentType = null) => {
  return postApiClient.post('/create-post', { 
    userId, 
    content, 
    imageBase64, 
    imageContentType,
    videoBase64,
    videoContentType
  });
};

// Get the community feed for a user
export const getFeed = (userId, limit = 20, offset = 0) => {
  return postApiClient.get('/get-feed', {
    params: { userId, limit, offset }
  });
};

// Like or unlike a post
export const likePost = (userId, postId) => {
  return postApiClient.post('/like-post', { userId, postId });
};

// Get posts by a specific user
export const getUserPosts = (userId, limit = 20, offset = 0) => {
  return postApiClient.get('/get-feed', {
    params: { userId, limit, offset, onlyOwn: true }
  });
};

// Add comment to a post
export const addComment = (userId, postId, content) => {
  return postApiClient.post('/comment-post', {
    userId,
    postId,
    content
  });
};

// Get comments for a specific post
export const getComments = (postId, limit = 50, offset = 0) => {
  return postApiClient.get('/get-comments', {
    params: { postId, limit, offset }
  });
}; 