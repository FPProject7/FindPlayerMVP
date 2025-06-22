import apiClient from './axiosConfig';

export const fetchChallengesFromAPI = async () => {
  const response = await apiClient.get('/dev/getChallenges'); // Adjust path if needed
  return response.data;
};
