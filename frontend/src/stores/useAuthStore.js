// frontend/src/stores/useAuthStore.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  // The persist middleware saves the store's data to the browser's localStorage.
  // This means the user will stay logged in even if they refresh the page.
  persist(
    (set, get) => ({ // get is added here for potential future use (e.g., getting current state)
      // --- STATE ---
      token: null,          // JWT IdToken
      accessToken: null,    // Access token for API calls
      refreshToken: null,   // Refresh token for getting new tokens
      user: null,           // User profile information
      isAuthenticated: false,
      tokenExpiry: null,    // When the token expires
      sessionExpired: false, // Track if session expired vs manual logout

      // --- ACTIONS ---
      /**
       * Call this after a successful API login.
       * @param {object} userProfile - Contains user details like { name, email, role }
       * @param {object} tokenData - Contains token details, e.g., { IdToken: 'jwt_string', AccessToken: '...', RefreshToken: '...' }
       */
      login: (userProfile, tokenData) => {
        const expiryTime = new Date(Date.now() + 3600000); // 1 hour (3600000 ms)
        
        set({
          token: tokenData.IdToken,
          accessToken: tokenData.AccessToken,
          refreshToken: tokenData.RefreshToken,
          user: userProfile,
          isAuthenticated: true,
          tokenExpiry: expiryTime,
          sessionExpired: false, // Reset session expired flag on login
        });
        // Zustand persist middleware will automatically save this to localStorage
      },

      // The logout action will clear all session data
      logout: (isSessionExpired = false) => {
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          tokenExpiry: null,
          sessionExpired: isSessionExpired, // Track if logout was due to session expiry
        });
        // Zustand persist middleware will automatically clear from localStorage
      },

      // Clear session expired flag (call this after showing the expired session modal)
      clearSessionExpiredFlag: () => {
        set({ sessionExpired: false });
      },

      // You might add an action here to update the token or user profile later
      // For example, if you get a new IdToken after refreshing
      updateToken: (newToken, newAccessToken, newRefreshToken) => {
        set({
          token: newToken,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || get().refreshToken,
          tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
          sessionExpired: false, // Reset session expired flag on token update
        });
      },

      // Add setUser action to update the user in the store
      setUser: (userProfile) => set({ user: userProfile }),

      // Check if token is expired or about to expire (within 5 minutes)
      isTokenExpired: () => {
        const state = get();
        if (!state.tokenExpiry) {
          return true;
        }
        
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        const isExpired = state.tokenExpiry <= now;
        
        return isExpired;
      },

      // Get valid access token (refresh if needed)
      getValidToken: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.accessToken) {
          throw new Error('User not authenticated');
        }
        if (!state.isTokenExpired()) {
          return state.accessToken;
        }
        // Token is expired, try to refresh
        return await get().refreshTokenAsync('access');
      },

      // Get valid ID token (for UI use only)
      getValidIdToken: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.token) {
          throw new Error('User not authenticated');
        }
        if (!state.isTokenExpired()) {
          return state.token;
        }
        // Token is expired, try to refresh
        return await get().refreshTokenAsync('id');
      },

      // Refresh user profile from Cognito
      refreshUserProfile: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.token) {
          throw new Error('User not authenticated');
        }
        
        try {
          // Decode the ID token to get user info (handle URL-safe base64)
          const base64 = state.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          const userProfile = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            role: payload['custom:role'],
            sport: payload['custom:sport'],
            position: payload['custom:position'],
            height: payload['custom:height'],
            country: payload['custom:country'],
            profilePictureUrl: payload['custom:profilePictureUrl'],
            isPremiumMember: payload['custom:is_premium_member'] === 'true'
          };
          
          set({
            user: userProfile
          });
          
          return userProfile;
        } catch (error) {
          console.error('Error refreshing user profile:', error);
          throw error;
        }
      },

      // Refresh token function - RENAMED to avoid conflict
      refreshTokenAsync: async (tokenType = 'access') => {
        const state = get();
        if (!state.refreshToken) {
          throw new Error('No refresh token available');
        }
        try {
          const response = await fetch('https://x0pskxuai7.execute-api.us-east-1.amazonaws.com/default/refreshToken', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refreshToken: state.refreshToken
            })
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Token refresh failed with status: ${response.status}`);
          }
          const data = await response.json();
          set({
            token: data.idToken,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || state.refreshToken,
            user: state.user, // Preserve user profile information
            isAuthenticated: state.isAuthenticated, // Preserve authentication state
            tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
            sessionExpired: false, // Reset session expired flag on successful refresh
          });
          return tokenType === 'id' ? data.idToken : data.accessToken;
        } catch (error) {
          set({
            token: null,
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            tokenExpiry: null,
            sessionExpired: true, // Mark as session expired when refresh fails
          });
          throw new Error('Authentication expired. Please log in again.');
        }
      },
    }),
    {
      name: 'auth-storage', // The key to use for storing data in localStorage
      // You can define which parts of the state to save if you don't want everything
      // partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// You can export the default if you prefer, but named export `useAuthStore` is common
export default useAuthStore;