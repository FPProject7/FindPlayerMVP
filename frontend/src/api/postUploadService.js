// frontend/src/api/postUploadService.js

import axios from 'axios';
import apiClient from './axiosConfig';

// API endpoint URLs for post uploads
const POST_UPLOAD_ENDPOINTS = {
  generatePostUploadUrl: 'https://fqwiqq2yra.execute-api.us-east-1.amazonaws.com/default/generatePostUploadUrl',
  completePostMultipartUpload: 'https://fqwiqq2yra.execute-api.us-east-1.amazonaws.com/default/complete-post-multipart-upload'
};

// Multipart upload configuration
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_CONCURRENT_PARTS = 3; // Upload 3 parts simultaneously

/**
 * Generate a multipart upload URL for posts (initiate or get part URL)
 * @param {string} postType - The type of post ('post' or 'event')
 * @param {string} uploadId - The multipart upload ID (optional for initiation)
 * @param {number} partNumber - The part number (optional for initiation)
 * @param {string} fileName - The file name (required for part uploads)
 * @returns {Promise<Object>} Object containing uploadUrl, uploadId, fileUrl, etc.
 */
export const generatePostMultipartUploadUrl = async (postType, uploadId = null, partNumber = null, fileName = null) => {
  try {
    let url = `${POST_UPLOAD_ENDPOINTS.generatePostUploadUrl}?postType=${postType}`;
    
    if (uploadId) {
      url += `&uploadId=${uploadId}`;
    }
    
    if (partNumber) {
      url += `&partNumber=${partNumber}`;
    }
    
    if (fileName) {
      url += `&fileName=${fileName}`; // Do NOT encodeURIComponent
    }
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate post upload URL');
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
          resolve({ etag }); // Keep quotes!
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
 * @param {string} postType - The type of post ('post' or 'event')
 * @param {string} uploadId - The multipart upload ID
 * @param {string} fileName - The file name
 * @param {Array} parts - Array of parts with ETags
 * @returns {Promise<string>} The final file URL
 */
export const completePostMultipartUpload = async (postType, uploadId, fileName, parts) => {
  try {
    const response = await apiClient.post(POST_UPLOAD_ENDPOINTS.completePostMultipartUpload, {
      uploadId,
      fileName,
      parts
    });
    
    return response.data.fileUrl;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to complete post multipart upload');
  }
};

/**
 * Upload video file for posts using multipart upload with progress tracking
 * @param {string} postType - Type of post ('post' or 'event')
 * @param {File} videoFile - Video file to upload
 * @param {Function} onProgress - Callback function to track upload progress (0-100)
 * @param {string} postKey - S3 key for the post video
 * @returns {Promise<string>} The final file URL
 */
export const uploadPostVideoWithMultipart = async (postType, videoFile, onProgress = null, postKey) => {
  try {
    
    // Step 1: Initiate multipart upload for post
    const initiateResponse = await generatePostMultipartUploadUrl(postType, null, null, postKey);
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
          const partResponse = await generatePostMultipartUploadUrl(postType, uploadId, partNumber, fileName);
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
          console.error(`Failed to upload part ${partNumber}:`, error);
          throw error;
        }
      });
      
      // Wait for all parts in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      uploadedParts.push(...batchResults);
    }
    
    
    // Step 4: Complete the multipart upload
    const finalFileUrl = await completePostMultipartUpload(postType, uploadId, fileName, uploadedParts);
    
    return finalFileUrl;
    
  } catch (error) {
    console.error('Post video upload failed:', error);
    throw error;
  }
}; 