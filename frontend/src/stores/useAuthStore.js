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
      lastTokenCheck: null, // Track when we last checked token validity

      // --- ACTIONS ---
      /**
       * Call this after a successful API login.
       * @param {object} userProfile - Contains user details like { name, email, role }
       * @param {object} tokenData - Contains token details, e.g., { IdToken: 'jwt_string', AccessToken: '...', RefreshToken: '...' }
       */
      login: (userProfile, tokenData) => {
        // Set token expiry to 30 days for mobile apps (like LinkedIn, Facebook)
        const expiryTime = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        
        set({
          token: tokenData.IdToken,
          accessToken: tokenData.AccessToken,
          refreshToken: tokenData.RefreshToken,
          user: userProfile,
          isAuthenticated: true,
          tokenExpiry: expiryTime,
          sessionExpired: false, // Reset session expired flag on login
          lastTokenCheck: new Date().toISOString(),
        });
        // Notify listeners (e.g., push registration) that a login occurred
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:loggedin'));
          }
        } catch (e) {
          // no-op
        }
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
          lastTokenCheck: null,
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
          tokenExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
          sessionExpired: false, // Reset session expired flag on token update
          lastTokenCheck: new Date().toISOString(),
        });
      },

      // Add setUser action to update the user in the store
      setUser: (userProfile) => set({ user: userProfile }),

      // Check if user is still authenticated on app startup
      checkAuthOnStartup: () => {
        const state = get();
        if (!state.isAuthenticated || !state.token || !state.refreshToken) {
          return false;
        }
        
        // Check if it's been more than 24 hours since last token check
        const lastCheck = state.lastTokenCheck ? new Date(state.lastTokenCheck) : null;
        const now = new Date();
        const hoursSinceLastCheck = lastCheck ? (now - lastCheck) / (1000 * 60 * 60) : 24;
        
        // If it's been more than 24 hours, force a token validation
        if (hoursSinceLastCheck > 24) {
          console.log('[AuthStore] More than 24 hours since last token check, validating...');
          // Don't await here, let the validation happen in the background
          state.validateAndRefreshToken().catch(error => {
            console.error('[AuthStore] Failed to validate token on startup:', error);
            // Only clear auth if it's a real auth error
            if (error.message.includes('refresh token') || error.message.includes('401') || error.message.includes('403')) {
              state.logout(true);
            }
          });
        }
        
        return state.isAuthenticated;
      },

      // Check if token is expired or about to expire (within 1 hour for mobile apps)
      isTokenExpired: () => {
        const state = get();
        if (!state.tokenExpiry) {
          return true;
        }
        
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour buffer
        const isExpired = state.tokenExpiry <= oneHourFromNow;
        
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

      // Validate and refresh token (new method for startup validation)
      validateAndRefreshToken: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.refreshToken) {
          throw new Error('No refresh token available');
        }
        
        console.log('[AuthStore] Validating token...');
        
        try {
          // Try to refresh the token to validate it's still good
          const result = await state.refreshTokenAsync('access');
          
          // Update last token check time
          set({ lastTokenCheck: new Date().toISOString() });
          
          return result;
        } catch (error) {
          console.error('[AuthStore] Token validation failed:', error);
          throw error;
        }
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
        
        console.log('[AuthStore] Attempting to refresh token...');
        
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
          
          console.log('[AuthStore] Refresh response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[AuthStore] Refresh failed:', errorData);
            
            // Check if it's a refresh token expired error
            if (response.status === 401 || errorData.message?.includes('refresh token')) {
              // Clear auth state immediately for expired refresh tokens
              set({
                token: null,
                accessToken: null,
                refreshToken: null,
                user: null,
                isAuthenticated: false,
                tokenExpiry: null,
                sessionExpired: true,
                lastTokenCheck: null,
              });
              throw new Error('Authentication expired. Please log in again.');
            }
            
            throw new Error(errorData.message || `Token refresh failed with status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[AuthStore] Refresh successful, updating tokens...');
          
          set({
            token: data.idToken,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || state.refreshToken,
            user: state.user, // Preserve user profile information
            isAuthenticated: state.isAuthenticated, // Preserve authentication state
            tokenExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
            sessionExpired: false, // Reset session expired flag on successful refresh
            lastTokenCheck: new Date().toISOString(),
          });
          
          console.log('[AuthStore] Token refresh completed successfully');
          return tokenType === 'id' ? data.idToken : data.accessToken;
        } catch (error) {
          console.error('[AuthStore] Token refresh failed:', error);
          
          // Only clear auth if it's a real authentication error, not a network error
          if (error.message.includes('refresh token') || error.message.includes('401') || error.message.includes('403') || error.message.includes('Authentication expired')) {
            set({
              token: null,
              accessToken: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              tokenExpiry: null,
              sessionExpired: true, // Mark as session expired when refresh fails
              lastTokenCheck: null,
            });
            throw new Error('Authentication expired. Please log in again.');
          } else {
            // For network errors, don't clear auth - just throw the error
            throw error;
          }
        }
      },
    }),
    {
      name: 'findplayer-auth', // The key to use for storing data in localStorage
      // Save all authentication data for mobile persistence
      partialize: (state) => ({ 
        token: state.token, 
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        tokenExpiry: state.tokenExpiry,
        sessionExpired: state.sessionExpired,
        lastTokenCheck: state.lastTokenCheck
      }),
      // Use a more reliable storage method for mobile
      storage: {
        getItem: (name) => {
          try {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch (error) {
            console.warn('Failed to get auth from localStorage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.warn('Failed to save auth to localStorage:', error);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.warn('Failed to remove auth from localStorage:', error);
          }
        },
      },
    }
  )
);

// You can export the default if you prefer, but named export `useAuthStore` is common
export default useAuthStore;