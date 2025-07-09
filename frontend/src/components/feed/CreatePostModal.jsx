import React, { useState, useRef } from 'react';
import { createPost } from '../../api/postApi';
import { useAuthStore } from '../../stores/useAuthStore';
import { createPortal } from 'react-dom';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Image must be less than 2MB.');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    setVideoError('');
    const file = e.target.files[0];
    
    if (!file) {
      setVideoFile(null);
      setVideoPreview(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setVideoError('Unsupported video format. Please use MP4, WebM, or MOV.');
      e.target.value = null;
      return;
    }

    // Validate file size (50MB)
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoError(`Video file size exceeds ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB.`);
      e.target.value = null;
      return;
    }

    setVideoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setVideoPreview(reader.result);
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

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoError('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const uploadVideoToS3 = async (videoFile) => {
    // For now, we'll use a simple approach similar to images
    // In a production environment, you'd want to implement multipart upload for videos
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ base64, contentType: videoFile.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(videoFile);
    });
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
      let videoBase64 = null;
      let videoContentType = null;

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

      // Convert video to base64 if provided
      if (videoFile) {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
          const videoData = await uploadVideoToS3(videoFile);
          videoBase64 = videoData.base64;
          videoContentType = videoData.contentType;
          setUploadProgress(100);
        } catch (videoError) {
          setError('Failed to process video file. Please try again.');
          setIsLoading(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const response = await createPost(
        user.id, 
        content.trim(), 
        imageBase64, 
        imageContentType,
        videoBase64,
        videoContentType
      );
      
      if (response.status === 201) {
        setContent('');
        setImageFile(null);
        setImagePreview(null);
        setVideoFile(null);
        setVideoPreview(null);
        setImageError('');
        setVideoError('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
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
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

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

          {/* Video Upload Section */}
          <div className="mb-4">
            <label htmlFor="video-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Add Video (optional)
            </label>
            <input
              ref={videoInputRef}
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#dc2626] file:hover:bg-[#b91c1c] file:text-white"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: 50MB. Supported formats: MP4, WebM, MOV
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

          {/* Video Preview */}
          {videoPreview && (
            <div className="mb-4 relative flex justify-center">
              <div className="relative w-full max-w-2xl bg-gray-100 border border-gray-300 rounded-lg overflow-hidden">
                <video
                  src={videoPreview}
                  controls
                  className="w-full h-auto max-h-64 object-contain"
                  style={{ background: '#f3f4f6' }}
                />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* File Info */}
          {videoFile && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Selected Video:</strong> {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-1 text-center">
                Processing video... {uploadProgress}%
              </div>
            </div>
          )}

          {/* Error Messages */}
          {imageError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {imageError}
            </div>
          )}

          {videoError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {videoError}
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
              className="border-2 border-red-500 text-red-600 bg-white rounded-full font-bold px-6 py-2 hover:bg-red-50 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full font-bold px-6 py-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !content.trim() || isUploading}
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreatePostModal; 