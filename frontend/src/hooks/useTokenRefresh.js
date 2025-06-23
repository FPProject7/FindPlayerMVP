import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const useTokenRefresh = () => {
  const refreshIntervalRef = useRef(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Check token every 10 seconds for testing
    const checkAndRefreshToken = async () => {
      try {
        const store = useAuthStore.getState();
        
        const expired = store.isTokenExpired();
        
        if (expired) {
          // Check if refreshTokenAsync is actually a function
          if (typeof store.refreshTokenAsync !== 'function') {
            throw new Error(`refreshTokenAsync is not a function. It's a: ${typeof store.refreshTokenAsync}`);
          }
          
          await store.refreshTokenAsync();
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
      }
    };

    // Initial check
    checkAndRefreshToken();

    // Set up interval (every 10 seconds for testing)
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated]);
}; 