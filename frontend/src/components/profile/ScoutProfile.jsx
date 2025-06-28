// frontend/src/components/profile/ScoutProfile.jsx
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';

const ScoutProfile = ({ profile, currentUserId, isFollowing, buttonLoading, onFollow, onUnfollow }) => {
  const {
    connections = 0,
    athletesViewed = 0,
    coachesViewed = 0,
    sport,
    quote,
  } = profile;

  return (
    <div>
      <ProfileHeader profile={profile} currentUserId={currentUserId} isFollowing={isFollowing} buttonLoading={buttonLoading} onFollow={onFollow} onUnfollow={onUnfollow} />
      <div className="flex flex-col items-center mb-2">
        <div className="text-lg font-semibold text-gray-800">
          {profile.name}
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
      <div className="flex justify-around my-4">
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{connections}</span>
          <span className="text-xs text-gray-500">Connections</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{athletesViewed}</span>
          <span className="text-xs text-gray-500">Athletes Viewed</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg">{coachesViewed}</span>
          <span className="text-xs text-gray-500">Coaches Viewed</span>
        </div>
      </div>
      <UpgradePremiumButton />
      <div className="text-xs text-center text-gray-400 mb-4">
        Get exclusive scouting insights & priority access to top athletes.
      </div>
      <ProfileTabs profile={profile} />
    </div>
  );
};

export default ScoutProfile;