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

      // --- ACTIONS ---
      /**
       * Call this after a successful API login.
       * @param {object} userProfile - Contains user details like { name, email, role }
       * @param {object} tokenData - Contains token details, e.g., { IdToken: 'jwt_string', AccessToken: '...', RefreshToken: '...' }
       */
      login: (userProfile, tokenData) => {
        const expiryTime = new Date(Date.now() + 3600000); // 1 hour (3600000 ms)
        console.log('🔐 Login - Setting token expiry to:', expiryTime.toLocaleTimeString());
        
        set({
          token: tokenData.IdToken,
          accessToken: tokenData.AccessToken,
          refreshToken: tokenData.RefreshToken,
          user: userProfile,
          isAuthenticated: true,
          tokenExpiry: expiryTime,
        });
        // Zustand persist middleware will automatically save this to localStorage
      },

      // The logout action will clear all session data
      logout: () => {
        set({
          token: null,
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          tokenExpiry: null,
        });
        // Zustand persist middleware will automatically clear from localStorage
      },

      // You might add an action here to update the token or user profile later
      // For example, if you get a new IdToken after refreshing
      updateToken: (newToken, newAccessToken, newRefreshToken) => {
        set({
          token: newToken,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || get().refreshToken,
          tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
        });
      },

      // Check if token is expired or about to expire (within 5 minutes)
      isTokenExpired: () => {
        const state = get();
        if (!state.tokenExpiry) {
          console.log('❌ No token expiry set');
          return true;
        }
        
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        const isExpired = state.tokenExpiry <= now;
        
        console.log('⏰ Token expiry check:', {
          now: now.toLocaleTimeString(),
          expiry: state.tokenExpiry.toLocaleTimeString(),
          fiveMinutesFromNow: fiveMinutesFromNow.toLocaleTimeString(),
          isExpired: isExpired
        });
        
        return isExpired;
      },

      // Get valid token (refresh if needed)
      getValidToken: async () => {
        const state = get();
        
        if (!state.isAuthenticated || !state.token) {
          throw new Error('User not authenticated');
        }

        if (!state.isTokenExpired()) {
          return state.token;
        }

        // Token is expired, try to refresh
        console.log('Token expired, attempting refresh...');
        return await get().refreshTokenAsync();
      },

      // Refresh token function - RENAMED to avoid conflict
      refreshTokenAsync: async () => {
        const state = get();
        
        if (!state.refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          console.log('Attempting to refresh token...');
          
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
          console.log('Token refresh successful');
          
          // Update tokens with 1 hour expiry
          set({
            token: data.idToken,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || state.refreshToken,
            tokenExpiry: new Date(Date.now() + 3600000), // 1 hour
          });

          return data.idToken;
        } catch (error) {
          console.error('Token refresh failed:', error);
          set({
            token: null,
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            tokenExpiry: null,
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