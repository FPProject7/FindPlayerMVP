// frontend/src/components/profile/ProfileChallengesTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';
import challengeClient, { coachClient } from '../../api/challengeApi';
import { useAuthStore } from '../../stores/useAuthStore';

const ProfileChallengesTab = ({ profile }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);
      setError(null);
      try {
        let res;
        if ((profile.role || '').toLowerCase() === 'coach') {
          // Check if we're viewing our own profile or another coach's profile
          const isOwnProfile = user?.id === profile.id;
          
          if (isOwnProfile) {
            // Fetch our own challenges using the coach endpoint (no parameters needed)
            res = await coachClient.get('/coach/challenges');
          } else {
            // Fetch another coach's challenges using the coachId parameter
            res = await coachClient.get('/coach/challenges', {
              params: { coachId: profile.id },
            });
          }
          setChallenges(res.data);
        } else {
          // Fetch submitted challenges for athlete using authenticated client
          res = await challengeClient.get('/challenges', {
            params: { athleteId: profile.id },
          });
          setChallenges(res.data);
        }
      } catch (err) {
        setError('Failed to load challenges.');
      } finally {
        setLoading(false);
      }
    };
    if (profile?.id) fetchChallenges();
  }, [profile.id, profile.role, user?.id]);

  if (loading) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">{error}</div>;
  if (!challenges.length) return <div className="text-center text-gray-400 py-8">No challenges yet.</div>;

  return (
    <div className="space-y-4">
      {challenges.map(challenge => (
        <div key={challenge.id || challenge.challenge_id} className="bg-white rounded-lg shadow p-4">
          <div className="font-bold text-lg mb-1">{challenge.title}</div>
          {challenge.xp_value && (
            <div className="text-sm text-gray-500 mb-1">{challenge.xp_value} XP / Submission</div>
          )}
          {/* Athlete challenge status pill styling */}
          {challenge.submission_status && (
            <div className="mb-1">
              {(() => {
                switch (challenge.submission_status) {
                  case 'pending':
                  case 'submitted':
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-gray-100 text-gray-500 border border-gray-300 inline-flex items-center">
                        <svg className="inline-block mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Submitted
                      </span>
                    );
                  case 'approved':
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-white text-red-600 border-2 border-red-500">
                        Approved
                      </span>
                    );
                  case 'denied':
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-500 text-white border-2 border-red-500">
                        Denied
                      </span>
                    );
                  default:
                    return null;
                }
              })()}
            </div>
          )}
          {/* Remove submitted date */}
          {challenge.coach_name && (
            <div className="text-xs text-gray-400">Coach: {challenge.coach_name}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfileChallengesTab;