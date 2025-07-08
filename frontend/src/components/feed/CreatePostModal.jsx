import React, { useState, useRef } from 'react';
import { createPost } from '../../api/postApi';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCreatePostStore } from '../../stores/useCreatePostStore';
import { createPortal } from 'react-dom';
import CreateEventForm from './CreateEventForm';

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef(null);
  const { activeTab, setActiveTab } = useCreatePostStore();

  const handleImageChange = (e) => {
    setImageError('');
    const file = e.target.files[0];
    
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Only image files are allowed.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Image must be less than 2MB.');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter some content for your post');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to create a post');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let imageBase64 = null;
      let imageContentType = null;

      // Convert image to base64 if provided
      if (imageFile) {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageContentType = imageFile.type;
      }

      const response = await createPost(user.id, content.trim(), imageBase64, imageContentType);
      
      if (response.status === 201) {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setImageError('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onPostCreated(response.data.post);
        onClose();
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[75vh] overflow-y-auto relative">
        {/* Close button in top right inside modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl z-10"
          disabled={isLoading}
        >
          ×
        </button>
        {/* Tab Header - always visible */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex w-full justify-center space-x-3 mb-2 mt-2">
            <button
              className={`flex-1 max-w-[140px] py-2 rounded-full border-2 font-bold text-sm uppercase transition-colors duration-200
                ${activeTab === 'post'
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'bg-white text-red-600 border-red-500 hover:bg-red-100'}`}
              onClick={() => setActiveTab('post')}
              disabled={isLoading}
            >
              Create Post
            </button>
            <button
              className={`flex-1 max-w-[140px] py-2 rounded-full border-2 font-bold text-sm uppercase transition-colors duration-200
                ${activeTab === 'event'
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                  : 'bg-white text-red-600 border-red-500 hover:bg-red-100'}`}
              onClick={() => setActiveTab('event')}
              disabled={isLoading}
            >
              Create Event
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'post' ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <textarea
                value={content}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setContent(e.target.value);
                }}
                placeholder="What's on your mind?"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                maxLength={500}
                disabled={isLoading}
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {content.length}/500 characters
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="mb-4">
              <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Add Image (optional)
              </label>
              <input
                ref={fileInputRef}
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#dc2626] file:hover:bg-[#b91c1c] file:text-white"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 2MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-4 relative flex justify-center">
                <div
                  className="relative w-full max-w-2xl bg-gray-100 border border-gray-300 rounded-lg overflow-hidden"
                  style={{ aspectRatio: '16/9', maxHeight: '350px' }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                    style={{ background: '#f3f4f6' }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {imageError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {imageError}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <CreateEventForm onClose={onClose} />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreatePostModal; 