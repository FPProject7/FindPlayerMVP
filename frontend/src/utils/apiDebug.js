// Debug utility for testing API endpoints
import challengeClient from '../api/challengeApi';
import { useAuthStore } from '../stores/useAuthStore';

export const testAPIEndpoints = async () => {
  const token = useAuthStore.getState().token;
  console.log('Current token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    console.error('No authentication token found');
    return;
  }

  try {
    // Test submissions endpoint
    console.log('Testing submissions endpoint...');
    const submissionsResponse = await challengeClient.get('/submissions');
    console.log('submissions response:', submissionsResponse.data);
  } catch (error) {
    console.error('submissions error:', error.response?.data || error.message);
  }

  try {
    // Test challenges endpoint with sample data
    console.log('Testing challenges endpoint...');
    const challengeData = {
      title: 'Test Challenge',
      description: 'This is a test challenge',
      xp_value: 100
    };
    const postResponse = await challengeClient.post('/challenges', challengeData);
    console.log('challenges response:', postResponse.data);
  } catch (error) {
    console.error('challenges error:', error.response?.data || error.message);
  }
};

// Add this to your browser console to test:
// import('./src/utils/apiDebug.js').then(module => module.testAPIEndpoints()); 