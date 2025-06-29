import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { addComment, getComments } from '../../api/postApi';
import { useAuthStore } from '../../stores/useAuthStore';
import ChallengeLoader from '../common/ChallengeLoader';

const CommentModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (isOpen && post) {
      loadComments();
    }
  }, [isOpen, post]);

  const loadComments = async () => {
    if (!post?.id) return;
    
    setIsLoading(true);
    try {
      const response = await getComments(post.id);
      if (response.status === 200) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !user?.id || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await addComment(user.id, post.id, comment.trim());
      
      if (response.status === 201) {
        // Add the new comment to the list
        const newComment = {
          id: response.data.comment.id,
          content: comment.trim(),
          user: {
            name: user.name || user.given_name || 'You',
            profilePictureUrl: user.profilePictureUrl
          },
          created_at: new Date().toISOString()
        };
        
        setComments(prev => [newComment, ...prev]);
        setComment('');
        
        if (onCommentAdded) {
          onCommentAdded(response.data.commentsCount);
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-md mx-auto flex flex-col" 
        style={{ 
          maxHeight: '80vh',
          maxWidth: '28rem',
          margin: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Comments</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500">No comments yet. Be the first to comment!</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  {comment.user.profilePictureUrl ? (
                    <img
                      src={comment.user.profilePictureUrl}
                      alt={comment.user.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-base flex-shrink-0">
                      <span>{(comment.user.name || 'U').charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-sm">{comment.user.name}</span>
                        <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-900">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Form */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= 200) setComment(e.target.value);
              }}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className={`w-32 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold py-2 rounded-full text-sm uppercase transition-colors duration-200 ${(!comment.trim() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </form>
          <div className="text-xs text-gray-400 text-left mt-1">{comment.length}/200</div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render the modal at the document root
  return createPortal(modalContent, document.body);
};

export default CommentModal; 