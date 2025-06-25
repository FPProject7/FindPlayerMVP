// Debug utility for testing API endpoints
import challengeClient from '../api/challengeApi';
import { useAuthStore } from '../stores/useAuthStore';

export const testAPIEndpoints = async () => {
  const token = useAuthStore.getState().token;
  
  if (!token) {
    return;
  }

  try {
    // Test submissions endpoint
    const submissionsResponse = await challengeClient.get('/submissions');
  } catch (error) {
    // No need to log error here, as it's already handled in the catch block
  }

  try {
    // Test challenges endpoint with sample data
    const challengeData = {
      title: 'Test Challenge',
      description: 'This is a test challenge',
      xp_value: 100
    };
    const postResponse = await challengeClient.post('/challenges', challengeData);
  } catch (error) {
    // No need to log error here, as it's already handled in the catch block
  }
};

// Add this to your browser console to test:
// import('./src/utils/apiDebug.js').then(module => module.testAPIEndpoints()); 