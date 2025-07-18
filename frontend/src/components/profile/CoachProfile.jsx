// frontend/src/components/profile/CoachProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import { useNavigate } from 'react-router-dom';
import FollowersModal from './FollowersModal';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import EditableBio from '../common/EditableBio';
import UpgradePremiumButton from './UpgradePremiumButton';
import { getFollowerCount } from '../../api/userApi';
import SubscribeButton from '../common/SubscribeButton';
import ManageSubscriptionButton from '../common/ManageSubscriptionButton';
import { getUserBio, updateUserBio } from '../../api/bioApi';
import api from '../../api/axiosConfig';

const CoachProfile = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, connections, challengesUploaded }) => {
  const {
    sessionsBooked = 0,
    sport,
    quote,
    role,
    id: userId,
  } = profile;

  const [showFollowers, setShowFollowers] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(connections);
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
  const isPremium = profile?.isPremiumMember || profile?.is_premium_member;
  const stripeCustomerId = profile?.stripeCustomerId || profile?.stripe_customer_id;

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

  const handleBookSession = () => {
    // Set booking flow flag for persistence across refresh
    localStorage.setItem('bookingFlow', 'true');
    // Navigate to messaging and open chat modal for this coach
    navigate('/messages', {
      state: {
        openChatWith: {
          userId: profile.id,
          name: profile.name,
          profilePic: profile.profilePictureUrl || profile.profile_picture_url || ''
        }
      }
    });
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
      
      {/* Show Book a Session for athletes viewing a premium coach profile - moved to prominent position */}
      {currentUserRole === 'athlete' && !isOwnProfile && (profile.is_premium_member || profile.isPremiumMember) && (
        <div className="flex justify-center my-4 px-4">
          <button
            className="w-full max-w-xl bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full px-12 py-3 font-semibold shadow-md transition-colors duration-150 text-lg"
            onClick={handleBookSession}
          >
            Book a Session
          </button>
        </div>
      )}
      
      {/* Show Book a Session for athletes viewing any coach profile (fallback) */}
      {((currentUserRole === 'athlete' && !isOwnProfile) || (!currentUserRole && !isOwnProfile)) && (
        <div className="flex justify-center my-4 px-4">
          <button
            className="w-full max-w-xl bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full px-12 py-3 font-semibold shadow-md transition-colors duration-150 text-lg"
            onClick={handleBookSession}
          >
            Book a Session
          </button>
        </div>
      )}
      
      {profile.country && (
        <div className="text-center text-gray-500 text-sm mb-2">
          Country: {profile.country}
        </div>
      )}
      
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
          <span className="font-bold text-lg">{sessionsBooked}</span>
          <span className="text-xs text-gray-500">Session Booked</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{challengesUploaded}</span>
          <span className="text-xs text-gray-500">Challenges</span>
        </div>
      </div>
      {isAuthenticated && (
        <FollowersModal userId={userId} open={showFollowers} onClose={handleCloseFollowers} />
      )}
      {currentUserRole !== 'athlete' && currentUserId === profile.id && (
        isPremium ? (
          <>
            <div className="premium-activated" style={{color: 'green', fontWeight: 'bold', margin: '16px 0', textAlign: 'center'}}>Premium Activated</div>
            <ManageSubscriptionButton customerId={stripeCustomerId} isPremium={isPremium} />
          </>
        ) : (
          <SubscribeButton userId={userId} userType="coach" isPremium={isPremium} />
        )
      )}
      {currentUserId === profile.id && (
        <div className="text-xs text-center text-gray-400 mb-4">
          Expand your reach, train more athletes, and grow your influence.
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

export default CoachProfile;