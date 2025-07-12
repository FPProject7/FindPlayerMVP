// frontend/src/components/profile/ProfilePostsTab.jsx
import { useEffect, useState } from 'react';
import ChallengeLoader from '../common/ChallengeLoader';
import { getUserPosts } from '../../api/postApi';
import PostCard from '../feed/PostCard';

const POSTS_PER_PAGE = 10;

const ProfilePostsTab = ({ profile }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = async (reset = false) => {
    if (!profile?.id) return;
    if (reset) {
      setLoading(true);
      setError(null);
    }
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await getUserPosts(profile.id, POSTS_PER_PAGE, currentOffset);
      if (response.status === 200) {
        const newPosts = response.data.posts || [];
        setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
        setOffset(reset ? POSTS_PER_PAGE : currentOffset + POSTS_PER_PAGE);
      }
    } catch {
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    loadPosts(true);
    // eslint-disable-next-line
  }, [profile.id]);

  if (loading && posts.length === 0) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="text-center text-red-400 py-8">{error}</div>;
  if (!posts.length) return <div className="text-center text-gray-400 py-8">No posts yet.</div>;

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && !loading && (
        <div className="flex justify-center my-6">
          <button
            onClick={() => loadPosts(false)}
            className="bg-[#FF0505] hover:bg-[#CC0000] text-white rounded-full font-bold px-8 py-2 transition-colors duration-200"
          >
            Load More
          </button>
        </div>
      )}
      {loading && posts.length > 0 && (
        <div className="flex justify-center items-center py-4"><ChallengeLoader /></div>
      )}
    </div>
  );
};

export default ProfilePostsTab;