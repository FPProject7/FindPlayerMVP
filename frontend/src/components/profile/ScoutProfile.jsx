// frontend/src/components/profile/ScoutProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';
import FollowersModal from './FollowersModal';
import VerifyButton from './VerifyButton';
import SubscribeButton from '../common/SubscribeButton';
import ManageSubscriptionButton from '../common/ManageSubscriptionButton';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import EditableBio from '../common/EditableBio';
import { useNavigate } from 'react-router-dom';
import { getFollowerCount, getUsersViewedByScouts } from '../../api/userApi';
import { getUserBio, updateUserBio } from '../../api/bioApi';
import api from '../../api/axiosConfig';

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

  const isPremium = profile?.isPremiumMember || profile?.is_premium_member;
  const stripeCustomerId = profile?.stripeCustomerId || profile?.stripe_customer_id;

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

  return (
    <div>
      <ProfileHeader profile={profile} currentUserId={currentUserId} isFollowing={isFollowing} buttonLoading={buttonLoading} onFollow={onFollow} onUnfollow={onUnfollow} />
      <div className="flex flex-col items-center mb-2">
        <div className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {profile.name}
          {(profile.is_verified || profile.isVerified) && (
            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              VERIFIED
            </div>
          )}
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
      
      {/* Bio Section */}
      <div className="px-4">
        <EditableBio
          bio={bio}
          isOwnProfile={currentUserId === profile.id}
          onSave={handleBioSave}
          placeholder="Add a description about yourself..."
        />
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
      {currentUserId === profile.id && (
        isPremium ? (
          <>
            <div className="premium-activated" style={{color: 'green', fontWeight: 'bold', margin: '16px 0', textAlign: 'center'}}>Premium Activated</div>
            <ManageSubscriptionButton customerId={stripeCustomerId} isPremium={isPremium} />
          </>
        ) : (
          <SubscribeButton userId={userId} userType="scout" isPremium={isPremium} />
        )
      )}
      <div className="text-xs text-center text-gray-400 mb-4">
        Get exclusive scouting insights & priority access to top athletes.
      </div>
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
      {currentUserId === profile.id && (
        <>
          {/* Show Verify button above sign out for scouts */}
          <VerifyButton isVerified={profile.is_verified || profile.isVerified} onStatusUpdate={() => window.location.reload()} />
          <div className="flex justify-center mt-8 mb-24">
            <button
              className="w-full max-w-xs bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
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