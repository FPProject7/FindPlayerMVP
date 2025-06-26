import React from 'react';
import ChallengeLoader from './ChallengeLoader';

const FollowButton = ({ isFollowing, loading, onFollow, onUnfollow }) => {
  const handleClick = () => {
    if (isFollowing) {
      onUnfollow();
    } else {
      onFollow();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full max-w-[200px] font-semibold py-2 rounded transition-colors duration-200 flex items-center justify-center ${
        isFollowing
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
      style={{ minWidth: 100, minHeight: 40 }}
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