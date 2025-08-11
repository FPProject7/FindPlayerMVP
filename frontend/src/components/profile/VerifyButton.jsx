import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { createProfileUrl } from '../../utils/profileUrlUtils';

const API_BASE_URL = 'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default';

const VerifyButton = ({ isVerified, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useAuthStore((state) => state.user);

  // Only show for Scouts who are not verified
  if (!user || user.role !== 'scout' || isVerified) {
    return null;
  }

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Create a proper return URL to the scout's profile page
      const profileUrl = createProfileUrl(user.name, user.role);
      
      // Always use a proper HTTP/HTTPS URL for Stripe return URL
      // Stripe requires return URLs to be valid web URLs, not Capacitor protocol URLs
      const returnUrl = `https://findplayer.app${profileUrl}`;
      
      // iOS-specific debugging
      console.log('Platform:', navigator.platform);
      console.log('User Agent:', navigator.userAgent);
      console.log('Window location:', window.location);
      console.log('Profile URL:', profileUrl);
      console.log('Final return URL:', returnUrl);
      
      // Validate the URL format
      try {
        const urlObj = new URL(returnUrl);
        console.log('URL validation successful:', urlObj.href);
      } catch (urlError) {
        console.error('Invalid URL constructed:', returnUrl, urlError);
        setError('Invalid URL format. Please try again.');
        return;
      }

      console.log('Sending verification request with returnUrl:', returnUrl);

      const res = await fetch(`${API_BASE_URL}/stripe-create-verification-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, returnUrl }),
      });
      
      const data = await res.json();
      
      console.log('API Response:', data);
      
      if (!res.ok) {
        console.error('Verification API error:', data);
        setError(data.error || `Server error: ${res.status}`);
        return;
      }
      
      if (data.url) {
        console.log('Redirecting to Stripe URL:', data.url);
        
        // iOS-specific redirect handling
        if (navigator.platform.includes('iPhone') || navigator.platform.includes('iPad') || navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          // For iOS, try using window.open first, then fallback to location.href
          try {
            const newWindow = window.open(data.url, '_blank');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              // Fallback to location.href
              window.location.href = data.url;
            }
          } catch (openError) {
            console.log('window.open failed, using location.href:', openError);
            window.location.href = data.url;
          }
        } else {
          // For other platforms, use the standard approach
          window.location.href = data.url;
        }
      } else {
        setError(data.error || 'Failed to start verification session');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col items-center w-full">
      <button
        onClick={handleVerify}
        disabled={isLoading}
        className={`w-full max-w-xs px-8 py-3 font-semibold rounded-full shadow-md transition-colors duration-200 text-base border-2
          ${isLoading
            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
            : 'bg-white border-[#FF0505] text-black hover:bg-[#ffeaea]'}
        `}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Check icon */}
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#FF0505" stroke="#FF0505" strokeWidth="2.5" />
          <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isLoading ? 'Redirecting...' : 'Verify'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default VerifyButton; 