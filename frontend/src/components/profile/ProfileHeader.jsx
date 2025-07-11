// frontend/src/components/profile/ProfileHeader.jsx
import FollowButton from '../common/FollowButton';
import { useState } from 'react';
import { FiShare2 } from 'react-icons/fi';
import { getXPDetails } from '../../utils/levelUtils';
import { createProfileUrl } from '../../utils/profileUrlUtils';
import UserStatusBadge from '../common/UserStatusBadge';

// Toast for share/copy feedback
const ShareToast = ({ message }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
      {message}
    </div>
  </div>
);

const ProfileHeader = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, quote, showShareButton = true }) => {
  // Share button logic
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const handleShare = async () => {
    const url = window.location.origin + createProfileUrl(profile.name, profile.role);

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.name, url });
        setToastMsg('Link shared!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
        return;
      } catch (e) {
        // Web Share API failed, continue to fallback
      }
    }

    // Try modern clipboard API
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setToastMsg('Copied to clipboard');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      return;
    } catch (e) {
      console.error('Modern clipboard API failed:', e);
    }

    // Try legacy fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        copied = true;
        setToastMsg('Copied to clipboard');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
        return;
      } else {
        console.error('Legacy execCommand copy failed: execCommand returned false');
      }
    } catch (e) {
      console.error('Legacy execCommand copy failed:', e);
    }

    // If all methods fail
    if (!copied) {
      setToastMsg('Failed to copy');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    }
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
      <div className="flex-1 flex flex-col justify-center h-full relative">
        {/* Centered name and level above XP bar */}
        <div className="flex flex-col items-center w-full mb-2">
          <span className="text-2xl font-bold text-gray-900 text-center block w-full flex items-center justify-center">
            {profile.name}
            {/* User status badge next to name */}
            <span className="ml-2">
              <UserStatusBadge user={profile} />
            </span>
          </span>
          <div className="font-bold text-gray-700 text-lg text-center w-full mt-1">LEVEL {xpDetails.level}</div>
        </div>
        {/* XP Bar: horizontal, fills space to right of image */}
        <div className="w-full h-2 bg-gray-200 rounded-full relative mb-2">
          <div
            className="h-2 bg-red-600 rounded-full absolute top-0 left-0"
            style={{ width: `${xpDetails.progress}%` }}
          ></div>
        </div>
        <div className="text-gray-500 text-base mb-1 w-full text-center">
          {profile.sport && <span>{profile.sport}</span>}
          {profile.sport && profile.position && <span> | </span>}
          {profile.position && <span>{profile.position}</span>}
        </div>
        {/* Move Share button below sport/position */}
        {showShareButton && (
          <div className="flex justify-center mt-2">
            <button
              className="p-1 bg-transparent border-none shadow-none hover:bg-gray-100 focus:outline-none"
              onClick={handleShare}
              title="Share profile"
              style={{ boxShadow: 'none' }}
            >
              <FiShare2 size={22} color="#dc2626" />
            </button>
          </div>
        )}
        {quote && (
          <div className="italic text-gray-400 text-sm mt-1 text-left w-full">"{quote}"</div>
        )}
        {/* Only show FollowButton if logged in and not viewing own profile */}
        {currentUserId && profile.id !== currentUserId && (
          <div className="flex justify-center mt-4 mb-2 w-full">
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