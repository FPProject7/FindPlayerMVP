// frontend/src/pages/HomePage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { getFeed } from '../api/postApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useCreatePostStore } from '../stores/useCreatePostStore';
import CreatePostModal from '../components/feed/CreatePostModal';
import PostCard from '../components/feed/PostCard';
import ChallengeLoader from '../components/common/ChallengeLoader';

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const user = useAuthStore((state) => state.user);
  const { isCreateModalOpen, closeCreateModal } = useCreatePostStore();
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);

  const loadFeed = async (reset = false) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await getFeed(user.id, 20, currentOffset);
      
      if (response.status === 200) {
        const newPosts = response.data.posts;
        setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
        setHasMore(response.data.hasMore);
        setOffset(reset ? 20 : currentOffset + 20);
      }
    } catch (err) {
      console.error('Error loading feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
  }, [user?.id]);

  const handlePostCreated = (newPost) => {
    // Attach current user info to the new post for consistency
    const postWithUser = {
      ...newPost,
      user: {
        name: user?.name || user?.firstName || 'Unknown User',
        profilePictureUrl: user?.profilePictureUrl || null,
      },
      likesCount: 0,
      isLiked: false,
      commentsCount: 0
    };
    
    setPosts(prev => [postWithUser, ...prev]);
  };

  const handleLikeUpdate = (postId, isLiked, likesCount) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, isLiked, likesCount }
        : post
    ));
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadFeed();
    }
  };

  const handleTouchStart = (e) => {
    if (isLoading) return;
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (isLoading) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - pullStartY);
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (isLoading) return;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      loadFeed(true).then(() => setRefreshing(false));
    }
    setPullDistance(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Add non-passive event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isLoading, pullDistance]);

  if (!user) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to FindPlayer</h1>
        <p className="text-gray-600">Please log in to see your community feed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}
      style={{ 
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull to Refresh Indicator (matches challenges tab) */}
      {pullDistance > 0 && (
        <div className="flex justify-center items-center py-4 text-gray-500">
          {pullDistance >= PULL_THRESHOLD ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
              Release to refresh
            </div>
          ) : (
            <div className="flex items-center">
              <div className="mr-2">↓</div>
              Pull down to refresh
            </div>
          )}
        </div>
      )}

      {refreshing && (
        <div className="flex justify-center items-center py-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
          Refreshing feed...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No posts yet in your feed.</p>
            <p className="text-gray-400 text-sm">
              Follow some users to see their posts here, or create your first post!
            </p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onLikeUpdate={handleLikeUpdate}
            />
          ))
        )}

        {/* Loading State */}
        {isLoading && posts.length === 0 && (
          <div className="py-4 flex flex-col justify-center items-center bg-white" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <ChallengeLoader />
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};

export default HomePage;