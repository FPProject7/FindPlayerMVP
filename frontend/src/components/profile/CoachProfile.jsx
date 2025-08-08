// frontend/src/components/profile/CoachProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import { useNavigate } from 'react-router-dom';
import FollowersModal from './FollowersModal';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import EditableBio from '../common/EditableBio';
import { getUserBio, updateUserBio } from '../../api/bioApi';
import api from '../../api/axiosConfig';
import { deleteMyAccount } from '../../api/userApi';
import DeleteAccountModal from '../common/DeleteAccountModal';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      // getFollowerCount(profile.id).then(setConnectionsCount).catch(() => setConnectionsCount(0)); // This line is removed as per the edit hint
    }
  }, [profile.id]);

  // When modal closes, refresh count
  const handleCloseFollowers = () => {
    setShowFollowers(false);
    if (profile?.id) {
      // getFollowerCount(profile.id).then(setConnectionsCount).catch(() => {}); // This line is removed as per the edit hint
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

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Delete account failed:', error);
      alert(error?.response?.data?.error || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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
      
      {/* Bio Section - moved above other content */}
      <div className="px-4 mb-4">
        <EditableBio
          bio={bio}
          isOwnProfile={currentUserId === profile.id}
          onSave={handleBioSave}
          placeholder="Add a description about yourself..."
        />
      </div>
      
      {/* Show Book a Session for athletes viewing a coach profile */}
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
      {/* Remove all logic and JSX related to SubscribeButton and UpgradePremiumButton. Set isPremium to true for all coaches in the UI. */}
      {currentUserId === profile.id && (
        <div className="text-xs text-center text-gray-400 mb-4">
          Expand your reach, train more athletes, and grow your influence.
        </div>
      )}
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
      {currentUserId === profile.id && (
        <div className="flex flex-col items-center gap-3 mt-8 mb-24 px-4">
          <button
            className="w-full max-w-xs bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
            onClick={() => { logout(); navigate('/login'); }}
          >
            Sign Out
          </button>
          <button
            className="w-full max-w-xs bg-white text-red-600 border-2 border-red-500 hover:bg-red-50 rounded-full px-8 py-3 font-semibold shadow-md transition-colors duration-200 text-base"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete My Account
          </button>
        </div>
      )}
      
      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CoachProfile;