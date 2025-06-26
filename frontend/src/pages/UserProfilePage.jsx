import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInfoUser } from '../api/userApi';
import { followUser, unfollowUser, checkFollowing } from '../api/followApi';
import ChallengeLoader from '../components/common/ChallengeLoader';
import FollowButton from '../components/common/FollowButton';
import { decodeProfileName } from '../utils/profileUrlUtils';

function isUUID(str) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}

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
        // Decode the URL parameter to handle special characters
        const decodedProfileId = profileUserId ? decodeProfileName(profileUserId) : null;
        console.log('Original profileUserId:', profileUserId);
        console.log('Decoded profileUserId:', decodedProfileId);

        // Always get current user info (for follow logic)
        const res = await getInfoUser();
        console.log('Current user info response:', res);
        setCurrentUserId(res.data.id);

        // Fetch profile info for the viewed user
        let profileRes;
        if (isUUID(decodedProfileId)) {
          profileRes = await getInfoUser(decodedProfileId);
        } else {
          profileRes = await getInfoUser(undefined, decodedProfileId); // pass username
        }
        console.log('Profile info response:', profileRes);
        setProfile(profileRes.data);

        // Optionally preload follow status
        if (res.data.id !== (profileRes.data.id || decodedProfileId)) {
          const followRes = await checkFollowing(res.data.id, profileRes.data.id);
          console.log('Follow status response:', followRes);
          setIsFollowing(followRes.data.isFollowing);
        }
      } catch (err) {
        setError('Failed to load profile.');
        console.error("Error loading user or follow status", err);
        if (err.response) {
          console.error('Error response:', err.response);
          if (err.response.status === 404) {
            setError('Profile not found. The user may not exist or the name may be incorrect.');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [profileUserId]);

  const handleFollow = async () => {
    setIsFollowing(true);
    setButtonLoading(true);
    try {
      await followUser(currentUserId, profile.id);
    } catch (err) {
      setIsFollowing(false);
      alert("Something went wrong, please try again.");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setIsFollowing(false);
    setButtonLoading(true);
    try {
      await unfollowUser(currentUserId, profile.id);
    } catch (err) {
      setIsFollowing(true);
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
          <FollowButton
            isFollowing={isFollowing}
            loading={buttonLoading}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
