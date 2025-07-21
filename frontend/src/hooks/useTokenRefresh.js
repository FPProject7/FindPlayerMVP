import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const useTokenRefresh = () => {
  const refreshIntervalRef = useRef(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Check token every 5 minutes for mobile apps (less aggressive)
    const checkAndRefreshToken = async () => {
      try {
        const store = useAuthStore.getState();
        
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
        }
      } catch (error) {
        console.error('[TokenRefresh] Error during token refresh:', error);
        // Don't clear auth on network errors, only on real auth errors
      }
    };

    // Initial check
    checkAndRefreshToken();

    // Set up interval (every 5 minutes for mobile apps)
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 5 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated]);
}; 