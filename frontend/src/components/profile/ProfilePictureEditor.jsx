import React, { useState, useRef } from 'react';
import { updateProfilePicture } from '../../api/profileApi';
import { useAuthStore } from '../../stores/useAuthStore';
import ChallengeLoader from '../common/ChallengeLoader';

// Constants for image validation
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const ProfilePictureEditor = ({ currentProfilePictureUrl, onUpdate, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { user, setUser } = useAuthStore();

  const handleFileSelect = (e) => {
    setError('');
    setPreview(null);
    setSelectedFile(null);

    const file = e.target.files[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please use JPG, PNG, GIF, or WebP.');
      e.target.value = null;
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Please choose a smaller image.`);
      e.target.value = null;
      return;
    }

    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      const profilePictureBase64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.onerror = (error) => {
          setError('Failed to read profile picture file.');
          reject(error);
        };
      });

      if (!profilePictureBase64) {
        setError('Failed to process profile picture. Please try another image.');
        setIsLoading(false);
        return;
      }

      // Call API to update profile picture
      const response = await updateProfilePicture(profilePictureBase64, selectedFile.type);

      // Update local user state
      const updatedUser = { ...user, profilePictureUrl: response.profilePictureUrl };
      setUser(updatedUser);

      // Call parent callback
      if (onUpdate) {
        onUpdate(response.profilePictureUrl);
      }

      // Close the editor
      if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error('Error updating profile picture:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update profile picture. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4 text-center">Update Profile Picture</h2>
        
        {/* Current Profile Picture */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {currentProfilePictureUrl ? (
              <img
                src={currentProfilePictureUrl}
                alt="Current Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-2xl border-2 border-gray-200">
                <span>{(user?.name || 'U').charAt(0)}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              <span>→</span>
            </div>
          </div>
        </div>

        {/* File Input */}
        <div className="mb-4">
          <label htmlFor="profile-picture-input" className="block text-sm font-medium text-gray-700 mb-2">
            Select New Picture
          </label>
          <input
            ref={fileInputRef}
            id="profile-picture-input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: JPG, PNG, GIF, WebP. Maximum size: 2MB.
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="flex justify-center">
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isLoading || !selectedFile}
            className="flex-1 px-4 py-2 text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <ChallengeLoader size="small" />
                <span className="ml-2">Updating...</span>
              </>
            ) : (
              'Update Picture'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureEditor; 