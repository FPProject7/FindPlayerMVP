import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const useTokenRefresh = () => {
  const refreshIntervalRef = useRef(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Check token every 10 minutes for better reliability
    const checkAndRefreshToken = async () => {
      try {
        const store = useAuthStore.getState();
        
        // Check if we have valid tokens
        if (!store.token || !store.refreshToken) {
          console.log('[TokenRefresh] No valid tokens found, clearing auth...');
          store.logout(true);
          return;
        }
        
        const expired = store.isTokenExpired();
        
        if (expired) {
          console.log('[TokenRefresh] Token expired, attempting refresh...');
          
          // Check if refreshTokenAsync is actually a function
          if (typeof store.refreshTokenAsync !== 'function') {
            console.error('[TokenRefresh] refreshTokenAsync is not a function');
            return;
          }
          
          await store.refreshTokenAsync();
          console.log('[TokenRefresh] Token refresh completed');
        } else {
          // Token is still valid, just update the last check time
          console.log('[TokenRefresh] Token is still valid');
        }
      } catch (error) {
        console.error('[TokenRefresh] Error during token refresh:', error);
        
        // If it's an authentication error, clear the auth state
        if (error.message.includes('Authentication expired') || 
            error.message.includes('refresh token') || 
            error.message.includes('401') || 
            error.message.includes('403')) {
          console.log('[TokenRefresh] Authentication error detected, logging out...');
          const store = useAuthStore.getState();
          store.logout(true);
        }
        // Don't clear auth on network errors, only on real auth errors
      }
    };

    // Initial check
    checkAndRefreshToken();

    // Set up interval (every 10 minutes for better reliability)
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 10 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated]);
}; 