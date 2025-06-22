import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore"; // adjust path if needed

const challengeClient = axios.create({
  baseURL: "https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default",
});

challengeClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    console.log("Current token:", token);  // ✅ Add this line for debugging
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No token found in useAuthStore");
    }
    return config;
  },
  (error) => Promise.reject(error)
);


export default challengeClient;
