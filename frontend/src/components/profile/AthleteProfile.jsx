import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { formatHeight, formatWeight } from '../../utils/levelUtils';
import { getFollowerCount } from '../../api/userApi';
import { starPlayer, unstarPlayer, getStarredPlayers } from '../../api/starredApi';

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
  const [connectionsCount, setConnectionsCount] = useState(connections);
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.id) {
      getFollowerCount(profile.id).then(setConnectionsCount).catch(() => setConnectionsCount(0));
    }
  }, [profile.id]);

  // When modal closes, refresh count
  const handleCloseFollowers = () => {
    setShowFollowers(false);
    if (profile?.id) {
      getFollowerCount(profile.id).then(setConnectionsCount).catch(() => {});
    }
  };
  const [starred, setStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);

  // Only scouts can star, and only on other users' profiles
  const isScout = isAuthenticated && authUser?.role === 'scout' && authUser.id !== profile.id;

  useEffect(() => {
    if (isScout) {
      setStarLoading(true);
      getStarredPlayers(authUser.id)
        .then(res => {
          setStarred((res.starred || []).some(p => p.athleteId === profile.id));
        })
        .finally(() => setStarLoading(false));
    }
  }, [isScout, authUser?.id, profile.id]);

  const handleToggleStar = async () => {
    if (!isScout) return;
    setStarLoading(true);
    try {
      if (starred) {
        await unstarPlayer(authUser.id, profile.id);
        setStarred(false);
      } else {
        await starPlayer(authUser.id, profile.id);
        setStarred(true);
      }
    } finally {
      setStarLoading(false);
    }
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
      {isScout && (
        <div className="flex justify-center mt-2 mb-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white shadow hover:bg-gray-50 disabled:opacity-60"
            onClick={handleToggleStar}
            disabled={starLoading}
            aria-label={starred ? 'Unstar Athlete' : 'Star Athlete'}
          >
            {starred ? (
              <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
            ) : (
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/></svg>
            )}
            <span className="text-sm font-semibold text-gray-700">
              {starred ? 'Starred' : 'Star Athlete'}
            </span>
            {starLoading && <span className="ml-2 animate-spin">⏳</span>}
          </button>
        </div>
      )}
      {/* Height and Weight */}
      {(height || weight || profile.country) && (
        <>
          <div className="w-full flex justify-center">
            <div className="h-px bg-gray-200 my-4" style={{ width: '70%' }}></div>
          </div>
          <div className="grid grid-cols-3 text-gray-500 text-sm mt-5 w-full max-w-xs mx-auto">
            <div className="text-center">{height ? formatHeight(height) : ''}</div>
            <div className="text-center">{weight ? formatWeight(weight) : ''}</div>
            <div className="text-center">{profile.country ? profile.country : ''}</div>
          </div>
        </>
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
              {connectionsCount}
            </button>
          ) : (
            <span className="font-bold text-lg text-gray-600">{connectionsCount}</span>
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
        <FollowersModal userId={userId} open={showFollowers} onClose={handleCloseFollowers} />
      )}
      {currentUserId === profile.id && <UpgradePremiumButton />}
      {currentUserId === profile.id && (
        <div className="text-xs text-center text-gray-400 mb-4">
          Stand out, get noticed, and unlock exclusive opportunities.
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

export default AthleteProfile;
