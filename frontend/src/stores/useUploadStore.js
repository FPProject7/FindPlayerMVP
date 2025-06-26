import { create } from 'zustand';

const useUploadStore = create((set, get) => ({
  // Active uploads: { challengeId: { progress, status, startTime, chunks, currentChunk, lastProgressUpdate } }
  activeUploads: {},
  
  // Start an upload
  startUpload: (challengeId) => {
    set((state) => ({
      activeUploads: {
        ...state.activeUploads,
        [challengeId]: {
          progress: 0,
          status: 'preparing', // 'preparing', 'uploading', 'submitting', 'completed', 'error'
          startTime: Date.now(),
          error: null,
          lastProgressUpdate: 0
        }
      }
    }));
  },
  
  // Update upload progress with throttling
  updateProgress: (challengeId, progress) => {
    const now = Date.now();
    const currentUpload = get().activeUploads[challengeId];
    
    // Only update if enough time has passed (100ms) or if it's a significant change
    if (currentUpload && (
      now - currentUpload.lastProgressUpdate > 100 || 
      Math.abs(progress - currentUpload.progress) > 5
    )) {
      set((state) => ({
        activeUploads: {
          ...state.activeUploads,
          [challengeId]: {
            ...state.activeUploads[challengeId],
            progress: Math.min(progress, 100),
            lastProgressUpdate: now
          }
        }
      }));
    }
  },
  
  // Update upload status
  updateStatus: (challengeId, status, error = null) => {
    set((state) => ({
      activeUploads: {
        ...state.activeUploads,
        [challengeId]: {
          ...state.activeUploads[challengeId],
          status,
          error
        }
      }
    }));
  },
  
  // Complete an upload
  completeUpload: (challengeId) => {
    set((state) => {
      const newUploads = { ...state.activeUploads };
      delete newUploads[challengeId];
      return { activeUploads: newUploads };
    });
  },
  
  // Get upload status for a challenge
  getUploadStatus: (challengeId) => {
    return get().activeUploads[challengeId] || null;
  },
  
  // Check if any uploads are active
  hasActiveUploads: () => {
    return Object.keys(get().activeUploads).length > 0;
  },
  
  // Clear all uploads (for cleanup)
  clearAllUploads: () => {
    set({ activeUploads: {} });
  }
}));

export default useUploadStore; 