// frontend/src/components/profile/ProfilePostsTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';

const ProfilePostsTab = ({ profile }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Replace with real API call
    setLoading(true);
    setTimeout(() => {
      setPosts([
        { id: 1, content: 'Happy to share with you all that we won!', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b', likes: 21, comments: 4, createdAt: '3 min ago', user: profile.name },
      ]);
      setLoading(false);
    }, 500);
  }, [profile.id]);

  if (loading) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">Failed to load posts.</div>;
  if (!posts.length) return <div className="text-center text-gray-400 py-8">No posts yet.</div>;

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.id} className="bg-white rounded-lg shadow p-4">
          {post.image && <img src={post.image} alt="post" className="w-full h-48 object-cover rounded mb-2" />}
          <div className="font-semibold mb-1">{post.user}</div>
          <div className="mb-2">{post.content}</div>
          <div className="flex text-xs text-gray-500 space-x-4">
            <span>{post.likes} likes</span>
            <span>{post.comments} comments</span>
            <span>{post.createdAt}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfilePostsTab;