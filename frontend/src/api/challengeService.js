// frontend/src/api/challengeService.js

import apiClient from './axiosConfig';

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
    console.log(`Generating upload URL for challenge: ${challengeId}`);
    
    // Send challenge ID as query parameter
    const response = await apiClient.get(`${API_ENDPOINTS.generateUploadUrl}?challengeId=${challengeId}`);
    
    console.log('Upload URL response:', response.data);
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
 * Upload video file directly to S3 using pre-signed URL
 * @param {string} uploadUrl - Pre-signed URL from generateUploadUrl
 * @param {File} videoFile - Video file to upload
 * @returns {Promise<string>} The final file URL
 */
export const uploadVideoToS3 = async (uploadUrl, videoFile) => {
  try {
    console.log('Uploading video to S3:', {
      uploadUrl: uploadUrl.substring(0, 100) + '...',
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type
    });

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: videoFile,
      headers: {
        'Content-Type': videoFile.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    // Extract the file URL from the upload URL
    const urlParts = uploadUrl.split('?')[0];
    console.log('Video uploaded successfully to:', urlParts);
    return urlParts;
  } catch (error) {
    console.error('Error uploading video to S3:', error);
    throw new Error('Failed to upload video file');
  }
};

/**
 * Submit a challenge with video URL (athlete_id will be extracted from JWT token)
 * @param {string} challengeId - The ID of the challenge
 * @param {string} videoUrl - The URL of the uploaded video
 * @returns {Promise<Object>} Submission response
 */
export const submitChallenge = async (challengeId, videoUrl) => {
  try {
    console.log('Submitting challenge:', { challengeId, videoUrl });
    
    const response = await apiClient.post(API_ENDPOINTS.submitChallenge(challengeId), {
      video_url: videoUrl
    });
    
    console.log('Challenge submission response:', response.data);
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
  try {
    console.log('Starting complete challenge submission for:', challengeId);
    
    // Step 1: Generate pre-signed URL
    const { uploadUrl, fileUrl } = await generateUploadUrl(challengeId);
    console.log('Generated upload URL successfully');
    
    // Step 2: Upload video to S3
    await uploadVideoToS3(uploadUrl, videoFile);
    console.log('Video uploaded to S3 successfully');
    
    // Step 3: Submit challenge with video URL (athlete_id extracted from JWT)
    const submission = await submitChallenge(challengeId, fileUrl);
    console.log('Challenge submitted successfully');
    
    return submission;
  } catch (error) {
    console.error('Error in complete challenge submission:', error);
    throw error;
  }
};