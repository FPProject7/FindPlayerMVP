// frontend/src/components/profile/ProfileLikesTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';
import { getNotifications } from '../../api/followApi';

const ProfileLikesTab = ({ profile }) => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLikes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getNotifications();
        // Only show likes and comments on user's posts
        const filtered = (res.data || []).filter(
          n => n.type === 'like_post' || n.type === 'comment_post'
        );
        setLikes(filtered);
      } catch (err) {
        setError('Failed to load likes.');
      } finally {
        setLoading(false);
      }
    };
    fetchLikes();
  }, [profile.id]);

  if (loading) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">{error}</div>;
  if (!likes.length) return <div className="text-center text-gray-400 py-8">No likes or comments yet.</div>;

  return (
    <div className="space-y-4">
      {likes.map(like => {
        const fromUser = like.fromUser || {};
        return (
          <div key={like.id} className="flex items-center bg-white rounded-lg shadow p-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl mr-4">
              {fromUser.profilePictureUrl ? (
                <img
                  src={fromUser.profilePictureUrl}
                  alt={fromUser.name || 'User'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span>{(fromUser.name || 'U').charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{fromUser.name || 'Unknown User'}</div>
              <div className="text-gray-500 text-sm">
                {like.type === 'like_post' && 'Liked your post.'}
                {like.type === 'comment_post' && 'Commented on your post.'}
              </div>
              {like.type === 'comment_post' && like.commentContent && (
                <div className="text-gray-700 text-sm mt-1">{like.commentContent}</div>
              )}
              {like.createdAt && (
                <div className="text-xs text-gray-300">{new Date(like.createdAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProfileLikesTab;