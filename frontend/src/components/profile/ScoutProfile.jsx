// frontend/src/components/profile/ScoutProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import FollowersModal from './FollowersModal';
import VerifyButton from './VerifyButton';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import EditableBio from '../common/EditableBio';
import { useNavigate } from 'react-router-dom';
import { getFollowerCount, getUsersViewedByScouts } from '../../api/userApi';
import { getUserBio, updateUserBio } from '../../api/bioApi';
import api from '../../api/axiosConfig';
import { deleteMyAccount } from '../../api/userApi';
import DeleteAccountModal from '../common/DeleteAccountModal';

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
      <ProfileHeader profile={profile} currentUserId={currentUserId} isFollowing={isFollowing} buttonLoading={buttonLoading} onFollow={onFollow} onUnfollow={onUnfollow} />
      
      {/* Bio Section - moved above other content */}
      <div className="px-4 mb-4">
        <EditableBio
          bio={bio}
          isOwnProfile={currentUserId === profile.id}
          onSave={handleBioSave}
          placeholder="Add a description about yourself..."
        />
      </div>
      
      {/* Additional profile info below header */}
      <div className="flex flex-col items-center mb-2">
        {sport && (
          <div className="font-bold text-gray-800 text-base mb-1">
            {sport}
          </div>
        )}
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
      {currentUserId === profile.id && (
        <>
          <div className="text-xs text-center text-gray-400 mb-4">
            Stand out, get noticed, and unlock exclusive opportunities.
          </div>
          {/* Show Verify button where premium button used to be */}
          <VerifyButton isVerified={profile.is_verified || profile.isVerified} onStatusUpdate={() => window.location.reload()} />
        </>
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

export default ScoutProfile;