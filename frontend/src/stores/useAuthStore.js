// frontend/src/stores/useAuthStore.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// The create function initializes the store
export const useAuthStore = create(
  // The persist middleware saves the store's data to the browser's localStorage.
  // This means the user will stay logged in even if they refresh the page.
  persist(
    (set) => ({
      // --- STATE ---
      token: null,          // This will hold the JWT IdToken
      user: null,           // This will hold the user's profile information
      isAuthenticated: false, // This will be true if the user is logged in

      // --- ACTIONS ---
      // The login action will be called after a successful API call
      login: (userData, tokenData) => {
        const userProfile = {
            name: userData.name,
            email: userData.email,
            role: userData.role
        };

        set({
          token: tokenData.IdToken, // We store the most important token
          user: userProfile,
          isAuthenticated: true,
        });
      },

      // The logout action will clear all session data
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage', // The key to use for storing data in localStorage
    }
  )
);