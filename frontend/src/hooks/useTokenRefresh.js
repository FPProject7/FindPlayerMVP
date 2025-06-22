import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

export const useTokenRefresh = () => {
  const refreshIntervalRef = useRef(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    console.log('=== TOKEN REFRESH HOOK INITIALIZED ===');
    console.log('isAuthenticated:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('❌ User not authenticated, skipping token refresh setup');
      return;
    }

    console.log('✅ User authenticated, setting up token refresh monitoring...');

    // Check token every 10 seconds for testing
    const checkAndRefreshToken = async () => {
      try {
        const store = useAuthStore.getState();
        
        // DEBUG: Let's see what's actually in the store
        console.log('🔍 DEBUG - Store contents:', {
          keys: Object.keys(store),
          refreshTokenAsyncType: typeof store.refreshTokenAsync,
          refreshTokenAsyncValue: store.refreshTokenAsync,
          isTokenExpiredType: typeof store.isTokenExpired,
          isTokenExpiredValue: store.isTokenExpired
        });
        
        console.log('🔄 Checking token expiry...');
        
        const expired = store.isTokenExpired();
        console.log('📅 Token expired?', expired);
        
        if (expired) {
          console.log('⚠️ Token expired, refreshing...');
          
          // Check if refreshTokenAsync is actually a function
          if (typeof store.refreshTokenAsync !== 'function') {
            throw new Error(`refreshTokenAsync is not a function. It's a: ${typeof store.refreshTokenAsync}`);
          }
          
          await store.refreshTokenAsync();
          console.log('✅ Token refresh completed');
        } else {
          console.log('✅ Token still valid, no refresh needed');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
      }
    };

    // Initial check
    console.log(' Performing initial token check...');
    checkAndRefreshToken();

    // Set up interval (every 10 seconds for testing)
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 10000);
    console.log('⏰ Token refresh interval set up (10 seconds)');

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        console.log('🧹 Token refresh interval cleared');
      }
    };
  }, [isAuthenticated]);
}; 