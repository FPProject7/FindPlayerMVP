// frontend/src/components/profile/ScoutProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

const ScoutProfile = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow }) => {
  const {
    connections = 0,
    athletesViewed = 0,
    coachesViewed = 0,
    sport,
    quote,
    id: userId,
  } = profile;

  const [showFollowers, setShowFollowers] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  return (
    <div>
      <ProfileHeader profile={profile} currentUserId={currentUserId} isFollowing={isFollowing} buttonLoading={buttonLoading} onFollow={onFollow} onUnfollow={onUnfollow} />
      <div className="flex flex-col items-center mb-2">
        <div className="text-lg font-semibold text-gray-800">
          {profile.name}
          {sport && <span className="text-gray-500 font-normal">, {sport}</span>}
        </div>
        {profile.country && (
          <div className="text-gray-500 text-sm mt-1">
            Country: {profile.country}
          </div>
        )}
        {quote && (
          <div className="italic text-gray-400 text-center mt-1">"{quote}"</div>
        )}
      </div>
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
          <span className="font-bold text-lg">{athletesViewed}</span>
          <span className="text-xs text-gray-500">Athletes Viewed</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{coachesViewed}</span>
          <span className="text-xs text-gray-500">Coaches Viewed</span>
        </div>
      </div>
      {isAuthenticated && (
        <FollowersModal userId={userId} open={showFollowers} onClose={() => setShowFollowers(false)} />
      )}
      <UpgradePremiumButton />
      <div className="text-xs text-center text-gray-400 mb-4">
        Get exclusive scouting insights & priority access to top athletes.
      </div>
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

export default ScoutProfile;