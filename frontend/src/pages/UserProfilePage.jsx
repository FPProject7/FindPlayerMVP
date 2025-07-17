import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInfoUser, getFollowerCount, trackProfileView } from '../api/userApi';
import { followUser, unfollowUser, checkFollowing } from '../api/followApi';
import ChallengeLoader from '../components/common/ChallengeLoader';
import FollowButton from '../components/common/FollowButton';
import { decodeProfileName, createProfileUrl } from '../utils/profileUrlUtils';
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
  const { role, profileUserId } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser); // <-- add this line
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);

  // Redirect /profile to the correct role-based URL for the current user
  useEffect(() => {
    if (!role && !profileUserId && isAuthenticated && user) {
      // Ensure user has the required properties before redirecting
      if (user.name && user.role) {
        const url = createProfileUrl(user.name, user.role);
        navigate(url, { replace: true });
      } else {
        // If user data is incomplete, try to refresh it
        if (user.id) {
          // Fetch complete user data and then redirect
          getInfoUser(user.id).then(response => {
            const completeUser = response.data;
            const url = createProfileUrl(completeUser.name, completeUser.role);
            navigate(url, { replace: true });
          }).catch(error => {
            console.error('Failed to fetch complete user data for redirect:', error);
          });
        }
      }
    }
  }, [role, profileUserId, isAuthenticated, user, navigate]);

  useEffect(() => {
    // Don't run the main profile loading logic if we're about to redirect
    if (!role && !profileUserId) return;
    
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        // Decode the URL parameter to handle special characters
        const decodedProfileId = profileUserId ? decodeProfileName(profileUserId) : null;
        
        // 1. If authenticated, get current user info (for follow logic)
        let currentUserRes = null;
        if (isAuthenticated) {
          // Use the public endpoint for both lookups to ensure consistent ID format
          // First get the current user's ID from the auth store
          const authUser = useAuthStore.getState().user;
          if (authUser && authUser.id) {
            currentUserRes = await getInfoUser(authUser.id);
            setCurrentUserId(currentUserRes.data.id);
          } else {
            setCurrentUserId(null);
          }
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
        
        const userProfile = profileRes.data;
        
        const actualUserRole = (userProfile.role || 'athlete').toLowerCase();
        const urlRole = (role || 'athlete').toLowerCase();
        
        // 3. Validate that the URL role matches the actual user role
        if (actualUserRole !== urlRole) {
          setError('Profile not found. The user may not exist or the name may be incorrect.');
          setLoading(false);
          return;
        }
        
        setProfile(userProfile);
        // If this is the current user's profile, update the global user in the store
        if (isAuthenticated && currentUserRes && currentUserRes.data.id === userProfile.id) {
          setUser(userProfile);
        } else {
        }
        
        // 4. Make all remaining API calls in parallel for better performance
        const parallelCalls = [];
        
        // Track profile view if authenticated and not viewing own profile
        if (isAuthenticated && currentUserRes && currentUserRes.data.id !== userProfile.id) {
          parallelCalls.push(
            trackProfileView(userProfile.id).catch(error => {
              console.error('Failed to track profile view:', error);
              // Don't fail the entire profile load if tracking fails
            })
          );
        } else {
        }
        
        // Fetch follower count for the profile user
        parallelCalls.push(
          getFollowerCount(userProfile.id).then(setFollowerCount).catch(error => {
            console.error('Failed to fetch follower count:', error);
            setFollowerCount(0);
          })
        );
        
        // Fetch completed challenges for athletes
        if (actualUserRole === 'athlete') {
          parallelCalls.push(
            fetchChallengesForAthlete(userProfile.id).then(challenges => {
              const submitted = Array.isArray(challenges) ? challenges.length : 0;
              setChallengesCompleted(submitted);
            }).catch(error => {
              console.error('Failed to fetch athlete challenges:', error);
              setChallengesCompleted(0);
            })
          );
        }
        
        // Fetch challenges posted by coaches
        if (actualUserRole === 'coach') {
          parallelCalls.push(
            fetchCoachChallenges(userProfile.id).then(challenges => {
              const posted = Array.isArray(challenges) ? challenges.length : 0;
              setChallengesCompleted(posted);
            }).catch(error => {
              console.error('Failed to fetch coach challenges:', error);
              setChallengesCompleted(0);
            })
          );
        }
        
        // Preload follow status (only if authenticated and not viewing own profile)
        if (isAuthenticated && currentUserRes && currentUserRes.data.id !== (userProfile.id || decodedProfileId)) {
          parallelCalls.push(
            checkFollowing(currentUserRes.data.id, userProfile.id).then(followRes => {
              setIsFollowing(followRes.data.isFollowing);
            }).catch(error => {
              console.error('Failed to check following status:', error);
              setIsFollowing(false);
            })
          );
        }
        
        // Wait for all parallel calls to complete
        await Promise.all(parallelCalls);
        
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
  }, [role, profileUserId, isAuthenticated]);

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
