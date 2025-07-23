import React, { useState, useEffect } from 'react';
import { likePost } from '../../api/postApi';
import { starPlayer, unstarPlayer } from '../../api/starredApi';
import { useAuthStore } from '../../stores/useAuthStore';
import CommentModal from './CommentModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { createProfileUrl } from '../../utils/profileUrlUtils';

const PostCard = ({ post, onLikeUpdate }) => {
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likesCount ?? post.likes_count ?? 0);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked ?? post.is_liked ?? false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount ?? post.comments_count ?? 0);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [localIsStarred, setLocalIsStarred] = useState(post.isStarred || false);
  const user = useAuthStore((state) => state.user);
  const [imageAspect, setImageAspect] = useState(null); // null, 'vertical', or 'horizontal'
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current user is a scout
  const isScout = user?.role?.toLowerCase() === 'scout';
  const isAthlete = post.user?.role?.toLowerCase() === 'athlete';
  
  // Check if we're viewing someone else's profile (not the home page)
  const isProfileView = location.pathname.includes('/profile/') || location.pathname.includes('/athlete/') || location.pathname.includes('/coach/') || location.pathname.includes('/scout/');
  const isOwnProfile = user?.id === post.user_id || user?.id === post.user?.id;
  const showStarButton = isScout && isAthlete && (!isProfileView || isOwnProfile);

  // Sync local state with post prop changes
  useEffect(() => {
    setLocalLikesCount(post.likesCount ?? post.likes_count ?? 0);
    setLocalIsLiked(post.isLiked ?? post.is_liked ?? false);
    setLocalIsStarred(post.isStarred || false);
  }, [post.likesCount, post.likes_count, post.isLiked, post.is_liked, post.isStarred]);

  // Defensive handling for missing user object
  const userObj = post.user || {
    name: post.user_name || post.username || 'Unknown User',
    profilePictureUrl: post.profile_picture_url || post.profilePictureUrl || null,
    role: post.role || 'athlete',
  };
  const userName = userObj.name || post.user_name || post.username || 'Unknown User';
  const userRole = userObj.role || 'athlete';
  const handleProfileClick = (e) => {
    e.stopPropagation();
    navigate(createProfileUrl(userName, userRole));
  };
  
  // Use a more stable approach for profile picture
  const userProfilePicture = imageError || !userObj.profilePictureUrl
    ? '/default-avatar.png'
    : userObj.profilePictureUrl;

  // Use snake_case for backend compatibility
  const createdAt = post.created_at || post.createdAt;
  const imageUrl = post.image_url || post.imageUrl;
  const videoUrl = post.video_url || post.videoUrl;
  const likesCount = post.likesCount ?? post.likes_count ?? 0;
  const isLiked = post.isLiked ?? post.is_liked ?? false;
  const commentsCount = post.commentsCount ?? post.comments_count ?? 0;

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    if (!user?.id || isLiking) return;

    setIsLiking(true);
    try {
      const response = await likePost(user.id, post.id);
      if (response.status === 200) {
        const newIsLiked = response.data.isLiked;
        const newLikesCount = response.data.likesCount;
        
        setLocalIsLiked(newIsLiked);
        setLocalLikesCount(newLikesCount);
        
        if (onLikeUpdate) {
          onLikeUpdate(post.id, newIsLiked, newLikesCount);
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleStarToggle = async () => {
    if (!user?.id || !isScout || !isAthlete || isStarring) return;

    setIsStarring(true);
    try {
      if (localIsStarred) {
        await unstarPlayer(user.id, post.user_id);
        setLocalIsStarred(false);
      } else {
        await starPlayer(user.id, post.user_id);
        setLocalIsStarred(true);
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    } finally {
      setIsStarring(false);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 relative">
        {/* Star button for scouts - positioned in top right */}
        {showStarButton && (
          <button
            onClick={handleStarToggle}
            disabled={isStarring}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={localIsStarred ? 'Unstar this athlete' : 'Star this athlete'}
          >
            <svg 
              className={`w-5 h-5 transition-colors duration-200 ${
                localIsStarred ? 'text-yellow-500 fill-current' : 'text-gray-400 hover:text-yellow-500'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/>
            </svg>
          </button>
        )}

        {/* User Info */}
        <div className="flex items-center mb-3">
          {userObj.profilePictureUrl && !imageError ? (
            <img
              src={userObj.profilePictureUrl}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover mr-3 cursor-pointer hover:opacity-80 transition"
              onError={() => setImageError(true)}
              onClick={handleProfileClick}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg mr-3 cursor-pointer select-none"
              onClick={handleProfileClick}
            >
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center">
              <div className="font-semibold text-gray-900 cursor-pointer hover:underline" onClick={handleProfileClick}>
                {userName}
              </div>
              {/* Star indicator for athletes starred by scouts - shown next to name */}
              {isScout && isAthlete && localIsStarred && (
                <svg 
                  className="w-4 h-4 text-yellow-400 ml-1" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  title="Starred by you"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z"/>
                </svg>
              )}
            </div>
            <div className="text-sm text-gray-500">{formatTimeAgo(createdAt)}</div>
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

        {/* Post Video */}
        {videoUrl && (
          <div className="mb-3 flex justify-center">
            <div className="relative w-full max-w-2xl bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full h-auto max-h-96 object-contain"
                style={{ background: '#f3f4f6' }}
                onError={() => setVideoError(true)}
              >
                Your browser does not support the video tag.
              </video>
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
                  Video could not be loaded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center space-x-2 text-sm transition-colors ${
                localIsLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <svg
                className="w-5 h-5 stroke-current fill-none"
                viewBox="0 0 24 24"
                style={{ strokeWidth: '2' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{localLikesCount}</span>
            </button>

            <button
              onClick={handleCommentClick}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>{localCommentsCount}</span>
            </button>
          </div>
        </div>
      </div>

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        postId={post.id}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
};

export default PostCard; 