import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChallengeLoader from '../common/ChallengeLoader';
import { connectionsApiClient } from '../../api/userApi';

const FollowersModal = ({ userId, open, onClose }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    connectionsApiClient.get('/connections', {
      params: { userId, type: 'followers' },
    })
      .then(res => {
        setFollowers(res.data.items || []);
      })
      .catch(() => setError('Failed to load followers.'))
      .finally(() => setLoading(false));
  }, [userId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-md mx-auto rounded-2xl shadow-2xl p-4 relative max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Followers</h2>
        {loading ? (
          <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">{error}</div>
        ) : followers.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No followers yet.</div>
        ) : (
          <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: '60vh' }}>
            {followers.map(follower => (
              <div
                key={follower.id}
                className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded"
                onClick={() => navigate(`/profile/${follower.id}`)}
              >
                {follower.profile_picture_url ? (
                  <img
                    src={follower.profile_picture_url}
                    alt={follower.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                    <span>{(follower.name || 'U').charAt(0)}</span>
                  </div>
                )}
                <span className="font-semibold text-gray-800 hover:underline">{follower.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersModal; 