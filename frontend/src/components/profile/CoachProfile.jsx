// frontend/src/components/profile/CoachProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import { useNavigate } from 'react-router-dom';

const CoachProfile = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow, connections }) => {
  const {
    sessionsBooked = 0,
    challengesUploaded = 0,
    sport,
    quote,
    role,
  } = profile;

  const navigate = useNavigate();
  // Assume we can get current user's role from profile or context if needed
  // For now, show Book Session if not coach and not viewing own profile
  const isOwnProfile = currentUserId === profile.id;
  const isCoach = (role || '').toLowerCase() === 'coach';
  // Placeholder: Assume current user is athlete if not coach
  const showBookSession = !isCoach && !isOwnProfile;

  const handleBookSession = () => {
    // Placeholder: navigate to messaging with this coach
    navigate(`/messages?user=${profile.id}`);
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
      <div className="flex justify-around my-4">
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{connections}</span>
          <span className="text-xs text-gray-500">Connections</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{sessionsBooked}</span>
          <span className="text-xs text-gray-500">Session Booked</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{challengesUploaded}</span>
          <span className="text-xs text-gray-500">Challenges Uploaded</span>
        </div>
      </div>
      {showBookSession && (
        <div className="flex justify-center my-4">
          <button className="bg-red-500 text-white rounded-full px-8 py-2 font-semibold shadow-md" onClick={handleBookSession}>
            Book a Session
          </button>
        </div>
      )}
      {currentUserId === profile.id && (
        <div className="text-xs text-center text-gray-400 mb-4">
          Expand your reach, train more athletes, and grow your influence.
        </div>
      )}
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
    </div>
  );
};

export default CoachProfile;