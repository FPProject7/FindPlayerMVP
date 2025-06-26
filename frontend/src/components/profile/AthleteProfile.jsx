import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import UpgradePremiumButton from './UpgradePremiumButton';

const AthleteProfile = ({
  profile,
  currentUserId,
  isFollowing,
  buttonLoading,
  onFollow,
  onUnfollow,
  connections = 0,
  achievements = 0,
  challengesCompleted = 0,
}) => {
  const {
    height,
    weight,
    position,
    sport,
    age,
    quote,
  } = profile;

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
      {/* Height and Weight */}
      {(height || weight) && (
        <div className="flex flex-row justify-center gap-6 text-gray-500 text-sm mt-1">
          {height && <span>Height: {height}</span>}
          {weight && <span>Weight: {weight}</span>}
        </div>
      )}
      {/* Stats Row */}
      <div className="flex justify-between my-6 max-w-xs mx-auto">
        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-lg">{connections}</span>
          <span className="text-xs text-gray-500">Connections</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-lg">{achievements}</span>
          <span className="text-xs text-gray-500">Achievements</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="font-bold text-lg">{challengesCompleted}</span>
          <span className="text-xs text-gray-500 text-center leading-tight">
            Challenges<br />Completed
          </span>
        </div>
      </div>
      {currentUserId === profile.id && <UpgradePremiumButton />}
      <div className="text-xs text-center text-gray-400 mb-4">
        Stand out, get noticed, and unlock exclusive opportunities.
      </div>
      <ProfileTabs profile={profile} isOwnProfile={currentUserId === profile.id} />
    </div>
  );
};

export default AthleteProfile;
