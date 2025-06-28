// frontend/src/components/profile/CoachProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import { useNavigate } from 'react-router-dom';
import FollowersModal from './FollowersModal';
import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import UpgradePremiumButton from './UpgradePremiumButton';

const CoachProfile = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, connections, challengesUploaded }) => {
  const {
    sessionsBooked = 0,
    sport,
    quote,
    role,
    id: userId,
  } = profile;

  const [showFollowers, setShowFollowers] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { user: currentUser } = useAuthStore();
  const currentUserRole = currentUser?.role?.toLowerCase();
  // Assume we can get current user's role from profile or context if needed
  // For now, show Book Session if not coach and not viewing own profile
  const isOwnProfile = currentUserId === profile.id;
  const isCoach = (role || '').toLowerCase() === 'coach';
  // Placeholder: Assume current user is athlete if not coach
  const showBookSession = !isCoach && !isOwnProfile;

  const handleBookSession = () => {
    // Placeholder: navigate to messaging with this coach
    navigate(`/messages?user=${profile.id}`);
  };

  return (
    <div>
      <ProfileHeader
        profile={profile}
        currentUserId={currentUserId}
        isFollowing={isFollowing}
        buttonLoading={buttonLoading}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
        quote={quote}
        showShareButton={true}
      />
      <div className="flex justify-around my-4">
        <div className="flex flex-col items-center">
          {isAuthenticated ? (
            <button
              className="font-bold text-lg text-red-600 hover:underline focus:outline-none bg-transparent border-none p-0 m-0"
              style={{ background: 'none' }}
              onClick={() => setShowFollowers(true)}
            >
              {connections}
            </button>
          ) : (
            <span className="font-bold text-lg text-gray-600">{connections}</span>
          )}
          <span className="text-xs text-gray-500">Connections</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{sessionsBooked}</span>
          <span className="text-xs text-gray-500">Session Booked</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{challengesUploaded}</span>
          <span className="text-xs text-gray-500">Challenges</span>
        </div>
      </div>
      {isAuthenticated && (
        <FollowersModal userId={userId} open={showFollowers} onClose={() => setShowFollowers(false)} />
      )}
      {/* Show Book a Session for athletes viewing a coach profile */}
      {currentUserRole === 'athlete' && !isOwnProfile && (
        <div className="flex justify-center my-4">
          <button
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full px-8 py-2 font-semibold shadow-md transition-colors duration-150"
            onClick={handleBookSession}
          >
            Book a Session
          </button>
        </div>
      )}
      {currentUserRole !== 'athlete' && currentUserId === profile.id && <UpgradePremiumButton />}
      {currentUserId === profile.id && (
        <div className="text-xs text-center text-gray-400 mb-4">
          Expand your reach, train more athletes, and grow your influence.
        </div>
      )}
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
      {currentUserId === profile.id && (
        <div className="flex justify-center mt-8 mb-24">
          <button
            className="w-full max-w-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
            onClick={() => { logout(); navigate('/login'); }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default CoachProfile;