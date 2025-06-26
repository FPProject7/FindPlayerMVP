// frontend/src/components/profile/ProfileChallengesTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';

const ProfileChallengesTab = ({ profile }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Replace with real API call
    setLoading(true);
    setTimeout(() => {
      setChallenges([
        { id: 1, title: 'Conditioning Workout', xp: 2, submissions: 500, coach: '@Coach.Stephan' },
      ]);
      setLoading(false);
    }, 500);
  }, [profile.id]);

  if (loading) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">Failed to load challenges.</div>;
  if (!challenges.length) return <div className="text-center text-gray-400 py-8">No challenges yet.</div>;

  return (
    <div className="space-y-4">
      {challenges.map(challenge => (
        <div key={challenge.id} className="bg-white rounded-lg shadow p-4">
          <div className="font-bold text-lg mb-1">{challenge.title}</div>
          <div className="text-sm text-gray-500 mb-1">{challenge.xp}XP / Submission</div>
          <div className="text-xs text-gray-400 mb-1">{challenge.submissions} Submitted the Challenge</div>
          <div className="text-xs text-gray-400">{challenge.coach}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileChallengesTab;