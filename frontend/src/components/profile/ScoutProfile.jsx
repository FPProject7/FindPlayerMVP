// frontend/src/components/profile/ScoutProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import VerifyButton from './VerifyButton';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { getFollowerCount, getUsersViewedByScouts } from '../../api/userApi';

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
  const [connectionsCount, setConnectionsCount] = useState(profile.connections || 0);
  const [athletesViewedCount, setAthletesViewedCount] = useState(0);
  const [coachesViewedCount, setCoachesViewedCount] = useState(0);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.id) {
      getFollowerCount(profile.id).then(setConnectionsCount).catch(() => setConnectionsCount(0));
      getUsersViewedByScouts(profile.id).then(data => {
        setAthletesViewedCount(data.athleteCount || 0);
        setCoachesViewedCount(data.coachCount || 0);
      }).catch(() => {
        setAthletesViewedCount(0);
        setCoachesViewedCount(0);
      });
    }
  }, [profile.id]);

  // When modal closes, refresh count
  const handleCloseFollowers = () => {
    setShowFollowers(false);
    if (profile?.id) {
      getFollowerCount(profile.id).then(setConnectionsCount).catch(() => {});
    }
  };

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
              {connectionsCount}
            </button>
          ) : (
            <span className="font-bold text-lg text-gray-600">{connectionsCount}</span>
          )}
          <span className="text-xs text-gray-500">Connections</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{athletesViewedCount}</span>
          <span className="text-xs text-gray-500">Athletes Viewed</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{coachesViewedCount}</span>
          <span className="text-xs text-gray-500">Coaches Viewed</span>
        </div>
      </div>
      {isAuthenticated && (
        <FollowersModal userId={userId} open={showFollowers} onClose={handleCloseFollowers} />
      )}
      <UpgradePremiumButton profile={profile} />
      <div className="text-xs text-center text-gray-400 mb-4">
        Get exclusive scouting insights & priority access to top athletes.
      </div>
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
      {currentUserId === profile.id && (
        <>
          {/* Show Verify button above sign out for scouts */}
          <VerifyButton isVerified={profile.is_verified} onStatusUpdate={() => window.location.reload()} />
          <div className="flex justify-center mt-8 mb-24">
            <button
              className="w-full max-w-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
              onClick={() => { logout(); navigate('/login'); }}
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ScoutProfile;