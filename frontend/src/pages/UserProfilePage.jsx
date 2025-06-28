import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInfoUser, getFollowerCount } from '../api/userApi';
import { followUser, unfollowUser, checkFollowing } from '../api/followApi';
import ChallengeLoader from '../components/common/ChallengeLoader';
import FollowButton from '../components/common/FollowButton';
import { decodeProfileName } from '../utils/profileUrlUtils';
import AthleteProfile from '../components/profile/AthleteProfile';
import CoachProfile from '../components/profile/CoachProfile';
import ScoutProfile from '../components/profile/ScoutProfile';
import challengeClient, { coachClient } from '../api/challengeApi';
import { fetchChallengesForAthlete, fetchCoachChallenges } from '../api/challengeApi';
import { useAuthStore } from '../stores/useAuthStore';

function isUUID(str) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
}

const UserProfilePage = () => {
  const { profileUserId } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        // Decode the URL parameter to handle special characters
        const decodedProfileId = profileUserId ? decodeProfileName(profileUserId) : null;
        // 1. If authenticated, get current user info (for follow logic)
        let currentUserRes = null;
        if (isAuthenticated) {
          currentUserRes = await getInfoUser();
          setCurrentUserId(currentUserRes.data.id);
        } else {
          setCurrentUserId(null);
        }
        // 2. Fetch profile info for the viewed user
        let profileRes;
        if (isUUID(decodedProfileId)) {
          profileRes = await getInfoUser(decodedProfileId);
        } else {
          profileRes = await getInfoUser(undefined, decodedProfileId); // pass username
        }
        setProfile(profileRes.data);
        // 3. Fetch follower count for the profile user
        const followerCountRes = await getFollowerCount(profileRes.data.id);
        setFollowerCount(followerCountRes);
        // 4. Fetch completed challenges for athletes
        if ((profileRes.data.role || '').toLowerCase() === 'athlete') {
          const challenges = await fetchChallengesForAthlete(profileRes.data.id);
          const submitted = Array.isArray(challenges) ? challenges.length : 0;
          setChallengesCompleted(submitted);
        }
        // 5. Fetch challenges posted by coaches
        if ((profileRes.data.role || '').toLowerCase() === 'coach') {
          const challenges = await fetchCoachChallenges(profileRes.data.id);
          const posted = Array.isArray(challenges) ? challenges.length : 0;
          setChallengesCompleted(posted);
        }
        // 6. Optionally preload follow status (only if authenticated and not viewing own profile)
        if (isAuthenticated && currentUserRes && currentUserRes.data.id !== (profileRes.data.id || decodedProfileId)) {
          const followRes = await checkFollowing(currentUserRes.data.id, profileRes.data.id);
          setIsFollowing(followRes.data.isFollowing);
        }
      } catch (err) {
        setError('Failed to load profile.');
        if (err.response && err.response.status === 404) {
          setError('Profile not found. The user may not exist or the name may be incorrect.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [profileUserId, isAuthenticated]);

  const handleFollow = async () => {
    setIsFollowing(true);
    setButtonLoading(true);
    try {
      await followUser(currentUserId, profile.id);
      const followerCountRes = await getFollowerCount(profile.id);
      setFollowerCount(followerCountRes);
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
      const followerCountRes = await getFollowerCount(profile.id);
      setFollowerCount(followerCountRes);
    } catch (err) {
      setIsFollowing(true);
      alert("Something went wrong, please try again.");
    } finally {
      setButtonLoading(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center items-center" style={{minHeight: 200}}><ChallengeLoader /></div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!profile) return <div className="p-4 text-center">Profile not found.</div>;

  // Choose the correct profile layout based on role
  let ProfileComponent;
  switch ((profile.role || '').toLowerCase()) {
    case 'coach':
      ProfileComponent = CoachProfile;
      break;
    case 'scout':
      ProfileComponent = ScoutProfile;
      break;
    case 'athlete':
    default:
      ProfileComponent = AthleteProfile;
      break;
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-lg shadow-md mt-6">
      {ProfileComponent === CoachProfile ? (
        <CoachProfile
          profile={profile}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          buttonLoading={buttonLoading}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          connections={followerCount}
          challengesUploaded={challengesCompleted}
          achievements={0}
        />
      ) : (
        <ProfileComponent
          profile={profile}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          buttonLoading={buttonLoading}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          connections={followerCount}
          achievements={0}
          challengesCompleted={challengesCompleted}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
