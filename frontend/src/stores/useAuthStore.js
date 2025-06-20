// frontend/src/stores/useAuthStore.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  // The persist middleware saves the store's data to the browser's localStorage.
  // This means the user will stay logged in even if they refresh the page.
  persist(
    (set, get) => ({ // get is added here for potential future use (e.g., getting current state)
      // --- STATE ---
      token: null,          // This will hold the JWT IdToken (e.g., for Authorization header)
      user: null,           // This will hold the user's profile information
      isAuthenticated: false, // This will be true if the user is logged in

      // --- ACTIONS ---
      /**
       * Call this after a successful API login.
       * @param {object} userProfile - Contains user details like { name, email, role }
       * @param {object} tokenData - Contains token details, e.g., { IdToken: 'jwt_string', AccessToken: '...', RefreshToken: '...' }
       */
      login: (userProfile, tokenData) => {
        set({
          token: tokenData.IdToken, // Store the IdToken
          user: userProfile,
          isAuthenticated: true,
        });
        // Zustand persist middleware will automatically save this to localStorage
      },

      // The logout action will clear all session data
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
        // Zustand persist middleware will automatically clear from localStorage
      },

      // You might add an action here to update the token or user profile later
      // For example, if you get a new IdToken after refreshing
      updateToken: (newToken) => {
        set({ token: newToken });
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