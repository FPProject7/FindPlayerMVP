import React, { useState, useEffect } from 'react';
import ChallengeLoader from './ChallengeLoader';

const FollowButton = ({ isFollowing, loading, onFollow, onUnfollow, className = "" }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 375 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 375);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClick = () => {
    if (isFollowing) {
      onUnfollow();
    } else {
      onFollow();
    }
  };

  const smallStyle = isSmallScreen
    ? {
        fontSize: '0.65rem',
        padding: '0.05rem 0.3rem',
        minHeight: 18,
        maxWidth: 60,
      }
    : {};

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full max-w-[200px] px-8 py-2 rounded-full font-bold text-lg shadow-md transition-colors duration-150 flex items-center justify-center focus:outline-none
        ${isFollowing
          ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-600'
          : 'bg-white text-red-600 border-2 border-red-600 hover:bg-red-50'}
        ${loading ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{ minHeight: 48, ...smallStyle }}
    >
      {loading ? (
        <span style={{ width: 32, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChallengeLoader />
        </span>
      ) : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
};

export default FollowButton; 