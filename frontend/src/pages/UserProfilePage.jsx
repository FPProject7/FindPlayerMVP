import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInfoUser } from '../api/userApi';
import { followUser, unfollowUser, checkFollowing } from '../api/followApi';
import ChallengeLoader from '../components/common/ChallengeLoader';

const UserProfilePage = () => {
  const { profileUserId } = useParams();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        // Always get current user info (for follow logic)
        const res = await getInfoUser();
        console.log('Current user info response:', res);
        setCurrentUserId(res.data.id);

        // Fetch profile info for the viewed user
        const profileRes = await getInfoUser(profileUserId);
        console.log('Profile info response:', profileRes);
        setProfile(profileRes.data);

        // Optionally preload follow status
        if (res.data.id !== profileUserId) {
          const followRes = await checkFollowing(res.data.id, profileUserId);
          console.log('Follow status response:', followRes);
          setIsFollowing(followRes.data.isFollowing);
        }
      } catch (err) {
        setError('Failed to load profile.');
        console.error("Error loading user or follow status", err);
        if (err.response) {
          console.error('Error response:', err.response);
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [profileUserId]);

  const handleFollowToggle = async () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setButtonLoading(true);

    try {
      if (nextState) {
        await followUser(currentUserId, profileUserId);
      } else {
        await unfollowUser(currentUserId, profileUserId);
      }
    } catch (err) {
      setIsFollowing(!nextState);
      console.error("Follow/unfollow failed", err);
      alert("Something went wrong, please try again.");
    } finally {
      setButtonLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading profile...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!profile) return <div className="p-4 text-center">Profile not found.</div>;

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md mt-6">
      <div className="flex flex-col items-center mb-4">
        {profile.profilePictureUrl ? (
          <img
            src={profile.profilePictureUrl}
            alt={profile.name}
            className="w-24 h-24 rounded-full object-cover border border-gray-200 shadow-sm mb-2"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-4xl mb-2">
            <span>{(profile.name || 'U').charAt(0)}</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
        <div className="text-gray-500 mb-1">{profile.email}</div>
        <div className="text-sm text-gray-400 mb-2">{profile.role}</div>
        {currentUserId && profile.id !== currentUserId && (
          <button
            onClick={handleFollowToggle}
            disabled={buttonLoading}
            className={`w-full max-w-[200px] font-semibold py-2 rounded transition-colors duration-200 flex items-center justify-center ${
              isFollowing
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            style={{ minWidth: 100, minHeight: 40 }}
          >
            {buttonLoading ? (
              <span style={{ width: 32, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallengeLoader />
              </span>
            ) : isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
