// frontend/src/components/profile/ProfileHeader.jsx
import FollowButton from '../common/FollowButton';
import { useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
import { getXPDetails } from '../../utils/levelUtils';

const ProfileHeader = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, quote, showShareButton = true }) => {
  // Share button logic
  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Calculate XP details from profile data
  const xpTotal = profile.xpTotal || 0;
  const xpDetails = getXPDetails(xpTotal);

  return (
    <div className="flex flex-row items-center w-full mb-4">
      {/* Profile Picture */}
      <div className="flex-shrink-0 mr-6 flex flex-col items-center">
        {profile.profilePictureUrl ? (
          <img
            src={profile.profilePictureUrl}
            alt={profile.name}
            className="w-32 h-32 rounded-full object-cover border border-gray-200 shadow-sm"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-5xl">
            <span>{(profile.name || 'U').charAt(0)}</span>
          </div>
        )}
      </div>
      {/* Info and XP Bar */}
      <div className="flex-1 flex flex-col justify-center h-full">
        {/* Centered name, share, and level */}
        <div className="flex flex-col items-center w-full mb-2">
          <div className="flex items-center justify-center mb-1">
            <h1 className="text-2xl font-bold text-gray-900 mr-2 text-center">{profile.name}</h1>
            {showShareButton && (
              <button
                className="ml-1 p-1 bg-transparent border-none shadow-none hover:bg-gray-100 focus:outline-none"
                onClick={handleShare}
                title="Share profile"
                style={{ boxShadow: 'none' }}
              >
                <FiShare2 size={18} color="#dc2626" />
              </button>
            )}
          </div>
          <div className="font-bold text-gray-700 text-lg text-center w-full mb-1">LEVEL {xpDetails.level}</div>
        </div>
        {/* XP Bar: horizontal, fills space to right of image */}
        <div className="w-full h-2 bg-gray-200 rounded-full relative mb-2">
          <div
            className="h-2 bg-red-600 rounded-full absolute top-0 left-0"
            style={{ width: `${xpDetails.progress}%` }}
          ></div>
        </div>
        <div className="text-gray-500 text-base mb-1 w-full">
          {profile.sport && <span>{profile.sport}</span>}
          {profile.position && <span>, {profile.position}</span>}
          {profile.age && <span>, {profile.age}</span>}
        </div>
        {quote && (
          <div className="italic text-gray-400 text-sm mt-1 text-left w-full">"{quote}"</div>
        )}
        {/* Only show FollowButton if logged in and not viewing own profile */}
        {currentUserId && profile.id !== currentUserId && (
          <div className="mt-2">
            <FollowButton
              isFollowing={isFollowing}
              loading={buttonLoading}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;