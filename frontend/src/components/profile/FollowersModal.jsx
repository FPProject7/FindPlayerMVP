import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChallengeLoader from '../common/ChallengeLoader';
import { connectionsApiClient } from '../../api/userApi';
import { createProfileUrl } from '../../utils/profileUrlUtils';

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
      .catch(() => setError('Failed to load connections.'))
      .finally(() => setLoading(false));
  }, [userId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-[90vw] max-w-3xl mx-auto rounded-2xl shadow-2xl p-4 relative max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Connections</h2>
        {loading ? (
          <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">{error}</div>
        ) : (
          <ul className="overflow-y-auto flex-1 divide-y divide-gray-200">
            {followers.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No connections found.</div>
            ) : (
              followers.map((user) => (
                <li key={user.id} className="py-3 flex items-center">
                  {user.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt="avatar" className="w-10 h-10 rounded-full mr-4 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg mr-4">
                      <span>{(user.name || 'U').charAt(0)}</span>
                    </div>
                  )}
                  <span className="font-medium">{user.name}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FollowersModal; 