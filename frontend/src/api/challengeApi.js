import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore"; // adjust path if needed

// For challenge and submission actions
const challengeClient = axios.create({
  baseURL: "https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default",
});

// For coach challenges
const coachClient = axios.create({
  baseURL: "https://a81zemot63.execute-api.us-east-1.amazonaws.com/default",
});

// For review (approve/deny) actions
const reviewClient = axios.create({
  baseURL: "https://2onjezcqo2.execute-api.us-east-1.amazonaws.com/default",
});

// Attach token to all clients
const attachAuth = async (config) => {
  try {
    const token = await useAuthStore.getState().getValidIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // Silent fail - token not available
  }
  return config;
};
challengeClient.interceptors.request.use(attachAuth, (error) => Promise.reject(error));
coachClient.interceptors.request.use(attachAuth, (error) => Promise.reject(error));
reviewClient.interceptors.request.use(attachAuth, (error) => Promise.reject(error));

export default challengeClient;
export { coachClient };

// Review a submission (approve or deny)
export const reviewSubmission = async (submissionId, action, comment) => {
  return reviewClient.post(`/submissions/${submissionId}/review`, {
    action,
    comment,
  });
};

const PUBLIC_CHALLENGES_URL = 'https://meq3pup4qj.execute-api.us-east-1.amazonaws.com/default/getChallenges';

export const fetchChallengesForAthlete = async (athleteId) => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  const params = { athleteId };
  if (!isAuthenticated) {
    // Use public endpoint for unauthenticated users
    const response = await axios.get(PUBLIC_CHALLENGES_URL, { params });
    return response.data;
  }
  // Use original endpoint for authenticated users
  const response = await challengeClient.get('/challenges', { params });
  return response.data;
};

const PUBLIC_COACH_CHALLENGES_URL = 'https://spv6m79758.execute-api.us-east-1.amazonaws.com/default/coachChallenges';

export const fetchCoachChallenges = async (coachId) => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  const params = { coachId };
  if (!isAuthenticated) {
    // Use public endpoint for unauthenticated users
    const response = await axios.get(PUBLIC_COACH_CHALLENGES_URL, { params });
    return response.data;
  }
  // Use original endpoint for authenticated users
  const response = await coachClient.get('/coach/challenges', { params });
  return response.data;
};
