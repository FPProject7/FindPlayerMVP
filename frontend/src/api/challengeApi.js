import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore"; // adjust path if needed

const challengeClient = axios.create({
  baseURL: "https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default",
});

challengeClient.interceptors.request.use(
  async (config) => {
    try {
      // Get a valid token (will refresh if needed)
      const token = await useAuthStore.getState().getValidToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("No token found in useAuthStore");
      }
    } catch (error) {
      console.error('Failed to get valid token:', error);
      // Don't throw here, let the request fail naturally
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default challengeClient;
