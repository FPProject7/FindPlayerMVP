import { create } from 'zustand';

const useUploadStore = create((set, get) => ({
  // Active uploads: { challengeId: { progress, status, startTime } }
  activeUploads: {},
  
  // Start an upload
  startUpload: (challengeId) => {
    set((state) => ({
      activeUploads: {
        ...state.activeUploads,
        [challengeId]: {
          progress: 0,
          status: 'uploading', // 'uploading', 'submitting', 'completed', 'error'
          startTime: Date.now(),
          error: null
        }
      }
    }));
  },
  
  // Update upload progress
  updateProgress: (challengeId, progress) => {
    set((state) => ({
      activeUploads: {
        ...state.activeUploads,
        [challengeId]: {
          ...state.activeUploads[challengeId],
          progress
        }
      }
    }));
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