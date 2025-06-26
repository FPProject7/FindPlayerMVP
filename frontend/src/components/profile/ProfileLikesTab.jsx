// frontend/src/components/profile/ProfileLikesTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';

const ProfileLikesTab = ({ profile }) => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Replace with real API call
    setLoading(true);
    setTimeout(() => {
      setLikes([
        { id: 1, type: 'post', content: 'Amazing win with @Coach.stephan !!', user: profile.name },
      ]);
      setLoading(false);
    }, 500);
  }, [profile.id]);

  if (loading) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">Failed to load likes.</div>;
  if (!likes.length) return <div className="text-center text-gray-400 py-8">No likes yet.</div>;

  return (
    <div className="space-y-4">
      {likes.map(like => (
        <div key={like.id} className="bg-white rounded-lg shadow p-4">
          <div className="font-semibold mb-1">{like.user}</div>
          <div className="mb-2">{like.content}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileLikesTab;