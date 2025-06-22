// frontend/src/api/challengeService.js

import apiClient from './axiosConfig';
import useUploadStore from '../stores/useUploadStore';

// API endpoint URLs
const API_ENDPOINTS = {
  getChallenges: 'https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges',
  postChallenge: 'https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges',
  generateUploadUrl: 'https://73sapj9jt1.execute-api.us-east-1.amazonaws.com/default/generateChallengeUploadUrl',
  submitChallenge: (challengeId) => `https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges/${challengeId}/submit`,
  refreshToken: 'https://x0pskxuai7.execute-api.us-east-1.amazonaws.com/default/refreshToken'
};

/**
 * Fetch all available challenges for athletes
 * @returns {Promise<Array>} Array of challenge objects
 */
export const fetchChallenges = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.getChallenges);
    return response.data;
  } catch (error) {
    console.error('Error fetching challenges:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch challenges');
  }
};

/**
 * Generate a pre-signed URL for video upload to S3
 * @param {string} challengeId - The ID of the challenge
 * @returns {Promise<Object>} Object containing uploadUrl and fileUrl
 */
export const generateUploadUrl = async (challengeId) => {
  try {
    // Send challenge ID as query parameter
    const response = await apiClient.get(`${API_ENDPOINTS.generateUploadUrl}?challengeId=${challengeId}`);
    
    return response.data;
  } catch (error) {
    console.error('Error generating upload URL:', error);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: error.config
    });
    throw new Error(error.response?.data?.message || 'Failed to generate upload URL');
  }
};

/**
 * Upload video file directly to S3 using pre-signed URL with progress tracking
 * @param {string} uploadUrl - Pre-signed URL from generateUploadUrl
 * @param {File} videoFile - Video file to upload
 * @param {Function} onProgress - Callback function to track upload progress (0-100)
 * @returns {Promise<string>} The final file URL
 */
export const uploadVideoToS3 = async (uploadUrl, videoFile, onProgress = null) => {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Extract the file URL from the upload URL
          const urlParts = uploadUrl.split('?')[0];
          resolve(urlParts);
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      // Start the upload
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', videoFile.type);
      xhr.send(videoFile);

    } catch (error) {
      console.error('Error uploading video to S3:', error);
      reject(new Error('Failed to upload video file'));
    }
  });
};

/**
 * Submit a challenge with video URL (athlete_id will be extracted from JWT token)
 * @param {string} challengeId - The ID of the challenge
 * @param {string} videoUrl - The URL of the uploaded video
 * @returns {Promise<Object>} Submission response
 */
export const submitChallenge = async (challengeId, videoUrl) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.submitChallenge(challengeId), {
      video_url: videoUrl
    });
    
    return response.data;
  } catch (error) {
    console.error('Error submitting challenge:', error);
    throw new Error(error.response?.data?.message || 'Failed to submit challenge');
  }
};

/**
 * Complete challenge submission flow: generate URL, upload video, submit challenge
 * @param {string} challengeId - The ID of the challenge
 * @param {File} videoFile - Video file to upload
 * @returns {Promise<Object>} Final submission response
 */
export const completeChallengeSubmission = async (challengeId, videoFile) => {
  const uploadStore = useUploadStore.getState();
  
  try {
    // Start tracking the upload
    uploadStore.startUpload(challengeId);
    
    // Step 1: Generate pre-signed URL
    uploadStore.updateStatus(challengeId, 'preparing');
    const { uploadUrl, fileUrl } = await generateUploadUrl(challengeId);
    
    // Step 2: Upload video to S3 with progress tracking
    uploadStore.updateStatus(challengeId, 'uploading');
    await uploadVideoToS3(uploadUrl, videoFile, (progress) => {
      uploadStore.updateProgress(challengeId, progress);
    });
    
    // Step 3: Submit challenge with video URL
    uploadStore.updateStatus(challengeId, 'submitting');
    const submission = await submitChallenge(challengeId, fileUrl);
    
    // Mark as completed
    uploadStore.updateStatus(challengeId, 'completed');
    
    // Clean up after a short delay to show completion
    setTimeout(() => {
      uploadStore.completeUpload(challengeId);
    }, 2000);
    
    return submission;
  } catch (error) {
    console.error('Error in complete challenge submission:', error);
    uploadStore.updateStatus(challengeId, 'error', error.message);
    
    // Clean up error state after a delay
    setTimeout(() => {
      uploadStore.completeUpload(challengeId);
    }, 5000);
    
    throw error;
  }
};