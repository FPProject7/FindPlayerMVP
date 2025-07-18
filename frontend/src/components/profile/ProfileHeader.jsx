// frontend/src/components/profile/ProfileHeader.jsx
import FollowButton from '../common/FollowButton';
import { useState, useEffect } from 'react';
import { FiShare2, FiEdit3 } from 'react-icons/fi';
import { getXPDetails } from '../../utils/levelUtils';
import { createProfileUrl } from '../../utils/profileUrlUtils';
import { PUBLIC_BASE_URL } from '../../config';
import UserStatusBadge from '../common/UserStatusBadge';
import ChallengeLoader from '../common/ChallengeLoader';
import ProfilePictureEditor from './ProfilePictureEditor';

// Toast for share/copy feedback
const ShareToast = ({ message }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
      {message}
    </div>
  </div>
);

const ProfileHeader = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, quote, showShareButton = true, isScout = false, starred = false, starLoading = false, onToggleStar, onProfilePictureUpdate }) => {
  const [showProfilePictureEditor, setShowProfilePictureEditor] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 375);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Share button logic
  const handleShare = async () => {
    const url = PUBLIC_BASE_URL + createProfileUrl(profile.name, profile.role);

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

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUserId && profile.id === currentUserId;

  const handleProfilePictureUpdate = (newProfilePictureUrl) => {
    // Use the callback to properly update the profile state
    if (onProfilePictureUpdate) {
      onProfilePictureUpdate(newProfilePictureUrl);
    }
  };

  return (
    <div className="flex flex-row items-center w-full mb-4">
      {/* Profile Picture */}
      <div className="flex-shrink-0 mr-6 flex flex-col items-center relative">
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
        
        {/* Edit Button - only show on own profile */}
        {isOwnProfile && (
          <button
            onClick={() => setShowProfilePictureEditor(true)}
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-lg"
            title="Edit profile picture"
          >
            <FiEdit3 size={16} />
          </button>
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
          {/* Hide level indicator for scouts */}
          {profile.role?.toLowerCase() !== 'scout' && (
            <div className="font-bold text-gray-700 text-lg text-center w-full mt-1">LEVEL {xpDetails.level}</div>
          )}
        </div>
        {/* Hide XP bar for scouts */}
        {profile.role?.toLowerCase() !== 'scout' && (
          <div className="w-full h-2 bg-gray-200 rounded-full relative mb-2">
            <div
              className="h-2 bg-red-600 rounded-full absolute top-0 left-0"
              style={{ width: `${xpDetails.progress}%` }}
            ></div>
          </div>
        )}
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
              <FiShare2 size={22} color="#FF0505" />
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
        {/* Star button for scouts */}
        {isScout && (
          <div className="flex justify-center mt-2 mb-2 w-full">
            <button
              className="w-full max-w-[200px] px-8 py-2 rounded-full font-bold text-lg shadow-md transition-colors duration-150 flex items-center justify-center focus:outline-none border-2 border-yellow-500 bg-white text-yellow-600 hover:bg-yellow-50 disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={onToggleStar}
              disabled={starLoading}
              aria-label={starred ? 'Unstar Athlete' : 'Star Athlete'}
              style={{ 
                minHeight: 48,
                ...(isSmallScreen && {
                  fontSize: '0.75rem',
                  padding: '0.25rem 1.5rem',
                  minHeight: 28,
                  maxWidth: 180,
                })
              }}
            >
              {starred ? (
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
              )}
              <span className="font-bold text-lg" style={isSmallScreen ? { fontSize: '0.8rem' } : {}}>
                {starred ? 'Starred' : 'Star Player'}
              </span>
            </button>
          </div>
        )}
      </div>
      
      {/* Profile Picture Editor Modal */}
      {showProfilePictureEditor && (
        <ProfilePictureEditor
          currentProfilePictureUrl={profile.profilePictureUrl}
          onUpdate={handleProfilePictureUpdate}
          onClose={() => setShowProfilePictureEditor(false)}
        />
      )}
    </div>
  );
};

export default ProfileHeader;