import React, { useState } from 'react';
import { likePost } from '../../api/postApi';
import { useAuthStore } from '../../stores/useAuthStore';
import CommentModal from './CommentModal';

const PostCard = ({ post, onLikeUpdate }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount ?? post.likes_count ?? 0);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked ?? post.is_liked ?? false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount ?? post.comments_count ?? 0);
  const [imageError, setImageError] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [imageAspect, setImageAspect] = useState(null); // null, 'vertical', or 'horizontal'

  // Defensive handling for missing user object
  const userObj = post.user || {
    name: post.user_name || post.username || 'Unknown User',
    profilePictureUrl: post.profile_picture_url || post.profilePictureUrl || null
  };
  const userName = userObj.name || post.user_name || post.username || 'Unknown User';
  
  // Use a more stable approach for profile picture
  const userProfilePicture = imageError || !userObj.profilePictureUrl
    ? '/default-avatar.png'
    : userObj.profilePictureUrl;

  // Use snake_case for backend compatibility
  const createdAt = post.created_at || post.createdAt;
  const imageUrl = post.image_url || post.imageUrl;
  const likesCount = post.likesCount ?? post.likes_count ?? 0;
  const isLiked = post.isLiked ?? post.is_liked ?? false;
  const commentsCount = post.commentsCount ?? post.comments_count ?? 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleLike = async () => {
    if (!user?.id || isLiking) return;

    setIsLiking(true);
    
    try {
      const response = await likePost(user.id, post.id);
      
      if (response.status === 200) {
        const { isLiked: newIsLiked, likesCount: newLikesCount } = response.data;
        setLocalIsLiked(newIsLiked);
        setLocalLikesCount(newLikesCount);
        
        if (onLikeUpdate) {
          onLikeUpdate(post.id, newIsLiked, newLikesCount);
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentClick = () => {
    setIsCommentModalOpen(true);
  };

  const handleCommentAdded = (newCommentsCount) => {
    setLocalCommentsCount(newCommentsCount);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
        {/* Post Header */}
        <div className="flex items-center mb-3">
          {userObj.profilePictureUrl && !imageError ? (
            <img
              src={userObj.profilePictureUrl}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover mr-3"
              onError={handleImageError}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl mr-3">
              <span>{(userName || 'U').charAt(0)}</span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{userName}</h3>
            <p className="text-sm text-gray-500">{formatDate(createdAt)}</p>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-3">
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Post Image */}
        {imageUrl && (
          <div className="mb-3 flex justify-center">
            {imageAspect === 'vertical' ? (
              <div className="relative w-full max-w-2xl bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Post content"
                  className="w-full h-auto object-contain"
                  style={{ background: '#f3f4f6', maxHeight: '700px' }}
                  onLoad={e => {
                    const img = e.target;
                    if (img.naturalHeight > img.naturalWidth) {
                      setImageAspect('vertical');
                    } else {
                      setImageAspect('horizontal');
                    }
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="relative w-full max-w-2xl bg-gray-100 border border-gray-200 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '500px' }}>
                <img
                  src={imageUrl}
                  alt="Post content"
                  className="absolute top-0 left-0 w-full h-full object-contain"
                  style={{ background: '#f3f4f6' }}
                  onLoad={e => {
                    const img = e.target;
                    if (img.naturalHeight > img.naturalWidth) {
                      setImageAspect('vertical');
                    } else {
                      setImageAspect('horizontal');
                    }
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-1 text-sm transition-colors ${
                localIsLiked 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <svg
                className={`w-5 h-5 ${localIsLiked ? 'fill-current' : 'stroke-current fill-none'}`}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={localIsLiked ? 0 : 2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{localLikesCount}</span>
            </button>

            <button 
              onClick={handleCommentClick}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{localCommentsCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        post={post}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
};

export default PostCard; 