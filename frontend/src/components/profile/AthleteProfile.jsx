import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { formatHeight, formatWeight } from '../../utils/levelUtils';
import { starPlayer, unstarPlayer, getStarredPlayers } from '../../api/starredApi';
import { getUserBio, updateUserBio } from '../../api/bioApi';
import EditableBio from '../common/EditableBio';

// Conversion functions
const inchesToCm = (inches) => Math.round(inches * 2.54);
const cmToInches = (cm) => Math.round(cm / 2.54);
const lbsToKg = (lbs) => Math.round(lbs * 0.453592);
const kgToLbs = (kg) => Math.round(kg / 0.453592);

// Format height for display
const formatHeightImperial = (inches) => {
  const feet = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${feet}'${inch}"`;
};

const formatHeightMetric = (cm) => {
  const meters = Math.floor(cm / 100);
  const remainingCm = cm % 100;
  return `${meters}m ${remainingCm}cm`;
};

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
  const [starred, setStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const [useMetric, setUseMetric] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');

  // Load bio from API
  useEffect(() => {
    const loadBio = async () => {
      try {
        const bioData = await getUserBio(profile.id);
        setBio(bioData.bio || '');
      } catch (error) {
        console.error('Failed to load bio:', error);
        // Keep existing bio if API fails
      }
    };
    
    if (profile.id) {
      loadBio();
    }
  }, [profile.id]);
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  
  // Check if current user is a scout
  const isScout = authUser?.role?.toLowerCase() === 'scout';

  // Check if athlete is starred by current scout
  useEffect(() => {
    const checkStarredStatus = async () => {
      if (isAuthenticated && isScout && authUser?.id && userId) {
        try {
          const response = await getStarredPlayers(authUser.id);
          const isStarred = response.starred?.some(player => player.athleteId === userId);
          setStarred(isStarred);
        } catch (error) {
          console.error('Failed to check starred status:', error);
          // Temporarily set starred to false to prevent UI errors
          setStarred(false);
        }
      }
    };
    
    checkStarredStatus();
  }, [isAuthenticated, isScout, authUser?.id, userId]);

  const handleToggleStar = async () => {
    if (!isAuthenticated || !isScout || !authUser?.id || !userId) return;
    
    setStarLoading(true);
    try {
      if (starred) {
        await unstarPlayer(authUser.id, userId);
        setStarred(false);
      } else {
        await starPlayer(authUser.id, userId);
        setStarred(true);
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
      alert('Failed to update star status. Please try again.');
    } finally {
      setStarLoading(false);
    }
  };

  const handleCloseFollowers = () => {
    setShowFollowers(false);
  };

  // Handle unit toggle
  const handleUnitToggle = () => {
    setUseMetric(!useMetric);
  };

  // Handle bio save
  const handleBioSave = async (newBio) => {
    try {
      await updateUserBio(profile.id, newBio);
      setBio(newBio);
    } catch (error) {
      console.error('Failed to save bio:', error);
      throw error;
    }
  };

  // Format height and weight based on unit preference
  const getFormattedHeight = () => {
    if (!height) return '';
    return useMetric ? formatHeightMetric(inchesToCm(height)) : formatHeightImperial(height);
  };

  const getFormattedWeight = () => {
    if (!weight) return '';
    return useMetric ? `${lbsToKg(weight)} kg` : `${weight} lbs`;
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
        isScout={isScout}
        starred={starred}
        starLoading={starLoading}
        onToggleStar={handleToggleStar}
      />
      {/* Height and Weight */}
      {(height || weight || profile.country) && (
        <>
          <div className="w-full flex justify-center">
            <div className="h-px bg-gray-200 my-4" style={{ width: '70%' }}></div>
          </div>
          {/* Unit Toggle */}
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className={!useMetric ? 'text-gray-700 font-medium' : ''}>Imperial</span>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input 
                  type="checkbox" 
                  checked={useMetric} 
                  onChange={handleUnitToggle}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: useMetric ? '#FF0505' : '#ccc',
                  transition: '.4s',
                  borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px',
                    width: '18px',
                    left: useMetric ? '26px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '.4s',
                    borderRadius: '50%'
                  }}></span>
                </span>
              </label>
              <span className={useMetric ? 'text-gray-700 font-medium' : ''}>Metric</span>
            </div>
          </div>
          <div className="grid grid-cols-3 text-gray-500 text-sm mt-2 w-full max-w-xs mx-auto">
            <div className="text-center">{height ? getFormattedHeight() : ''}</div>
            <div className="text-center">{weight ? getFormattedWeight() : ''}</div>
            <div className="text-center">{profile.country ? profile.country : ''}</div>
          </div>
        </>
      )}
      
      {/* Bio Section */}
      <div className="px-4 mb-4">
        <EditableBio
          bio={bio}
          isOwnProfile={currentUserId === profile.id}
          onSave={handleBioSave}
          placeholder="Add a description about yourself..."
        />
      </div>
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
            className="w-full max-w-xs bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
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
