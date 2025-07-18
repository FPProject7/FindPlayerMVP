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
      const returnUrl = `${window.location.origin}${profileUrl}`;
      const res = await fetch(`${API_BASE_URL}/stripe-create-verification-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, returnUrl }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start verification session');
      }
    } catch (err) {
      setError('Network error');
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