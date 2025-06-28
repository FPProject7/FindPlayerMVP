import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

const AthleteProfile = ({
  profile,
  currentUserId,
  isFollowing,
  buttonLoading,
  onFollow,
  onUnfollow,
  connections = 0,
  achievements = 0,
  challengesCompleted = 0,
}) => {
  const {
    height,
    weight,
    position,
    sport,
    age,
    quote,
    id: userId,
  } = profile;
  const [showFollowers, setShowFollowers] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

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
      {/* Height and Weight */}
      {(height || weight) && (
        <div className="flex flex-row justify-center gap-6 text-gray-500 text-sm mt-1">
          {height && <span>Height: {height}</span>}
          {weight && <span>Weight: {weight}</span>}
        </div>
      )}
      {/* Stats Row */}
      <div className="flex justify-between my-6 max-w-xs mx-auto">
        <div className="flex flex-col items-center flex-1">
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
        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-lg">{achievements}</span>
          <span className="text-xs text-gray-500">Achievements</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-lg">{challengesCompleted}</span>
          <span className="text-xs text-gray-500 text-center leading-tight">
            Challenges
          </span>
        </div>
      </div>
      {isAuthenticated && (
        <FollowersModal userId={userId} open={showFollowers} onClose={() => setShowFollowers(false)} />
      )}
      {currentUserId === profile.id && <UpgradePremiumButton />}
      <div className="text-xs text-center text-gray-400 mb-4">
        Stand out, get noticed, and unlock exclusive opportunities.
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

export default AthleteProfile;
