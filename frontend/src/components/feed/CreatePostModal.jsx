import React, { useState, useRef, useEffect } from 'react';
import { createPost } from '../../api/postApi';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCreatePostStore } from '../../stores/useCreatePostStore';
import { createPortal } from 'react-dom';
import CreateEventForm from './CreateEventForm';
import { uploadPostVideoWithMultipart } from '../../api/postUploadService';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef(null);
  const { activeTab, setActiveTab } = useCreatePostStore();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFileChange = (e) => {
    setFileError('');
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setFileError('Unsupported file format.');
      return;
    }

    // Validate file size
    if (ALLOWED_IMAGE_TYPES.includes(selectedFile.type) && selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      setFileError('Image must be less than 2MB.');
      return;
    }
    if (ALLOWED_VIDEO_TYPES.includes(selectedFile.type) && selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      setFileError('Video must be less than 50MB.');
      return;
    }

    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadVideoToS3 = async (videoFile) => {
    // Use multipart upload for videos
    const postKey = `posts/${user.id}/${Date.now()}-${videoFile.name}`;
    
    try {
      const videoUrl = await uploadPostVideoWithMultipart(
        'post',
        videoFile,
        (progress) => setUploadProgress(progress),
        postKey
      );
      
      return { videoUrl, contentType: videoFile.type };
    } catch (error) {
      console.error('Video upload failed:', error);
      throw error;
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
      let videoBase64 = null;
      let videoContentType = null;

      // Convert image to base64 if provided
      if (file) {
        if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          imageContentType = file.type;
        } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
          setIsUploading(true);
          setUploadProgress(0);
          
          try {
            const videoData = await uploadVideoToS3(file);
            videoBase64 = videoData.videoUrl; // This is now the S3 URL, not base64
            videoContentType = videoData.contentType;
            setUploadProgress(100);
          } catch (videoError) {
            setError('Failed to upload video file. Please try again.');
            setIsLoading(false);
            setIsUploading(false);
            return;
          } finally {
            setIsUploading(false);
          }
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
        removeFile();
        if (onPostCreated) onPostCreated(response.data.post);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto relative">
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

            {/* File Upload Section */}
            <div className="mb-4">
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Add Image or Video (optional)
              </label>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#dc2626] file:hover:bg-[#b91c1c] file:text-white"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 2MB for images, 50MB for videos. Supported formats: JPG, PNG, GIF, MP4, WebM, MOV
              </p>
            </div>

            {/* File Preview */}
            {filePreview && (
              <div className="mb-4 relative flex justify-center">
                <div
                  className="relative w-full max-w-2xl bg-gray-100 border border-gray-300 rounded-lg overflow-hidden"
                  style={{ aspectRatio: '16/9', maxHeight: '350px' }}
                >
                  {ALLOWED_IMAGE_TYPES.includes(file?.type) ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="absolute top-0 left-0 w-full h-full object-contain"
                      style={{ background: '#f3f4f6' }}
                    />
                  ) : (
                    <video
                      src={filePreview}
                      controls
                      className="w-full h-auto max-h-64 object-contain"
                      style={{ background: '#f3f4f6' }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* File Info */}
            {file && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Selected File:</strong> {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
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
                  Processing file... {uploadProgress}%
                </div>
              </div>
            )}

            {/* Error Messages */}
            {fileError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {fileError}
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
        ) : (
          <CreateEventForm onClose={onClose} />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreatePostModal; 