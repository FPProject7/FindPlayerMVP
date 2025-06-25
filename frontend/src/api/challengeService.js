// frontend/src/api/challengeService.js

import apiClient from './axiosConfig';
import useUploadStore from '../stores/useUploadStore';

// API endpoint URLs
const API_ENDPOINTS = {
  getChallenges: 'https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges',
  postChallenge: 'https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges',
  generateUploadUrl: 'https://73sapj9jt1.execute-api.us-east-1.amazonaws.com/default/generateChallengeUploadUrl',
  completeMultipartUpload: 'https://hs574m04ei.execute-api.us-east-1.amazonaws.com/default/complete-multipart-upload',
  submitChallenge: (challengeId) => `https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges/${challengeId}/submit`,
  refreshToken: 'https://x0pskxuai7.execute-api.us-east-1.amazonaws.com/default/refreshToken'
};

// Multipart upload configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_PARTS = 3; // Upload 3 parts simultaneously

/**
 * Fetch all available challenges for athletes
 * @returns {Promise<Array>} Array of challenge objects
 */
export const fetchChallenges = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.getChallenges);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch challenges');
  }
};

/**
 * Generate a multipart upload URL (initiate or get part URL)
 * @param {string} challengeId - The ID of the challenge
 * @param {string} uploadId - The multipart upload ID (optional for initiation)
 * @param {number} partNumber - The part number (optional for initiation)
 * @param {string} fileName - The file name (required for part uploads)
 * @returns {Promise<Object>} Object containing uploadUrl, uploadId, fileUrl, etc.
 */
export const generateMultipartUploadUrl = async (challengeId, uploadId = null, partNumber = null, fileName = null) => {
  try {
    let url = `${API_ENDPOINTS.generateUploadUrl}?challengeId=${challengeId}`;
    
    if (uploadId) {
      url += `&uploadId=${uploadId}`;
    }
    
    if (partNumber) {
      url += `&partNumber=${partNumber}`;
    }
    
    if (fileName) {
      url += `&fileName=${encodeURIComponent(fileName)}`;
    }
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate upload URL');
  }
};

/**
 * Upload a single part to S3 using pre-signed URL
 * @param {string} uploadUrl - Pre-signed URL for the part
 * @param {Blob} partBlob - The part blob to upload
 * @param {Function} onProgress - Callback function to track upload progress
 * @returns {Promise<Object>} Object containing ETag and part number
 */
export const uploadPartToS3 = async (uploadUrl, partBlob, onProgress = null) => {
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
          const etag = xhr.getResponseHeader('ETag');
          resolve({ etag: etag.replace(/"/g, '') }); // Remove quotes from ETag
        } else {
          reject(new Error(`Part upload failed with status: ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Part upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Part upload was aborted'));
      });

      // Start the upload
      xhr.open('PUT', uploadUrl);
      xhr.send(partBlob);

    } catch (error) {
      reject(new Error('Failed to upload part'));
    }
  });
};

/**
 * Complete multipart upload by combining all parts
 * @param {string} challengeId - The ID of the challenge
 * @param {string} uploadId - The multipart upload ID
 * @param {string} fileName - The file name
 * @param {Array} parts - Array of parts with ETags
 * @returns {Promise<string>} The final file URL
 */
export const completeMultipartUpload = async (challengeId, uploadId, fileName, parts) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.completeMultipartUpload, {
      uploadId,
      fileName,
      parts
    });
    
    return response.data.fileUrl;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to complete multipart upload');
  }
};

/**
 * Upload video file using multipart upload with progress tracking
 * @param {string} challengeId - The ID of the challenge
 * @param {File} videoFile - Video file to upload
 * @param {Function} onProgress - Callback function to track upload progress (0-100)
 * @returns {Promise<string>} The final file URL
 */
export const uploadVideoWithMultipart = async (challengeId, videoFile, onProgress = null) => {
  const uploadStore = useUploadStore.getState();
  
  try {
    // Step 1: Initiate multipart upload
    const initiateResponse = await generateMultipartUploadUrl(challengeId);
    const { uploadId, fileName, fileUrl } = initiateResponse;
    
    // Step 2: Split file into chunks
    const chunks = [];
    let start = 0;
    let partNumber = 1;
    
    while (start < videoFile.size) {
      const end = Math.min(start + CHUNK_SIZE, videoFile.size);
      const chunk = videoFile.slice(start, end);
      chunks.push({ partNumber, chunk, start, end });
      start = end;
      partNumber++;
    }
    
    // Step 3: Upload parts with progress tracking
    const uploadedParts = [];
    let totalBytesUploaded = 0;
    
    // Upload parts in batches to limit concurrent requests
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_PARTS) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT_PARTS);
      
      const batchPromises = batch.map(async ({ partNumber, chunk }) => {
        try {
          // Get presigned URL for this part
          const partResponse = await generateMultipartUploadUrl(challengeId, uploadId, partNumber, fileName);
          const { uploadUrl } = partResponse;
          
          // Upload the part
          const partResult = await uploadPartToS3(uploadUrl, chunk, (partProgress) => {
            // Simple cumulative progress: completed bytes + current part progress
            const currentPartBytes = (partProgress / 100) * chunk.size;
            const totalProgress = totalBytesUploaded + currentPartBytes;
            const overallProgress = Math.round((totalProgress / videoFile.size) * 100);
            if (onProgress) onProgress(overallProgress);
          });
          
          // Update total bytes after part completion
          totalBytesUploaded += chunk.size;
          
          // Final progress update
          const overallProgress = Math.round((totalBytesUploaded / videoFile.size) * 100);
          if (onProgress) onProgress(overallProgress);
          
          return {
            PartNumber: partNumber,
            ETag: partResult.etag
          };
        } catch (error) {
          throw error;
        }
      });
      
      // Wait for all parts in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      uploadedParts.push(...batchResults);
    }
    
    // Step 4: Complete the multipart upload
    const finalFileUrl = await completeMultipartUpload(challengeId, uploadId, fileName, uploadedParts);
    
    return finalFileUrl;
    
  } catch (error) {
    throw error;
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
    const response = await apiClient.post(API_ENDPOINTS.submitChallenge(challengeId), {
      video_url: videoUrl
    });
    
    return response.data;
  } catch (error) {
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
    
    // Step 1: Upload video using multipart upload with progress tracking
    uploadStore.updateStatus(challengeId, 'uploading');
    const fileUrl = await uploadVideoWithMultipart(challengeId, videoFile, (progress) => {
      uploadStore.updateProgress(challengeId, progress);
    });
    
    // Step 2: Submit challenge with video URL
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
    uploadStore.updateStatus(challengeId, 'error', error.message);
    
    // Clean up error state after a delay
    setTimeout(() => {
      uploadStore.completeUpload(challengeId);
    }, 5000);
    
    throw error;
  }
};

// Legacy functions for backward compatibility
export const generateUploadUrl = generateMultipartUploadUrl;
export const uploadVideoToS3 = uploadVideoWithMultipart;