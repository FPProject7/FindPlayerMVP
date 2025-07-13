import React, { useState } from 'react';
import { updateUserStatus } from '../../api/userApi';
import { useAuthStore } from '../../stores/useAuthStore';

const VerifyButton = ({ isVerified, onStatusUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useAuthStore((state) => state.user);

  // Only show for Scouts
  if (!user || user.role !== 'scout') {
    return null;
  }

  const handleVerify = async () => {
    if (isVerified) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await updateUserStatus({ is_verified: true });
      onStatusUpdate?.(); // Callback to refresh user data
    } catch (err) {
      setError('Failed to update verification status. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col items-center w-full">
      <button
        onClick={handleVerify}
        disabled={isVerified || isLoading}
        className={`w-full max-w-xs px-8 py-3 font-semibold rounded-full shadow-md transition-colors duration-200 text-base border-2
          ${isVerified || isLoading
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
        {isLoading ? 'Verifying...' : isVerified ? 'Verified' : 'Verify'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default VerifyButton; 