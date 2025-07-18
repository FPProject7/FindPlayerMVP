// frontend/src/pages/challenges/AthleteChallengesView.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ChallengeLoader from '../../components/common/ChallengeLoader';
import { useAuthStore } from '../../stores/useAuthStore';
import { fetchChallenges, completeChallengeSubmission } from '../../api/challengeService';
import apiClient from '../../api/axiosConfig';
import useUploadStore from '../../stores/useUploadStore';
import { updateStreak } from '../../api/userApi';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

// API endpoint URLs
const API_ENDPOINTS = {
  submitChallenge: (challengeId) => `https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges/${challengeId}/submit`,
  checkSubmissionStatus: (challengeId) => `https://ltn2ed1bh9.execute-api.us-east-1.amazonaws.com/checkSubmissionStatus?id=${challengeId}`
};

const AthleteChallengesView = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle');
  const [videoFile, setVideoFile] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const location = useLocation();
  const { user, isAuthenticated, token } = useAuthStore();
  const [submissionStatuses, setSubmissionStatuses] = useState({});
  const { activeUploads, getUploadStatus } = useUploadStore();
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  // Add state for error popup
  const [quotaErrorMessage, setQuotaErrorMessage] = useState("");
  // Add state for submission status loading
  const [submissionStatusLoading, setSubmissionStatusLoading] = useState({});
  // Add state for list-wide submission status loading
  const [loadingSubmissionStatuses, setLoadingSubmissionStatuses] = useState(false);

  const prevLocationKey = React.useRef(location.key);
  const containerRef = useRef(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  // Fetch quota information
  const fetchQuotaInfo = async () => {
    setQuotaLoading(true);
    try {
      const authState = useAuthStore.getState();
      const token = authState.token;
      const response = await fetch("https://ay6fctbr9c.execute-api.us-east-1.amazonaws.com/getSubmissionQuota", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      setQuotaInfo(data);
    } catch (error) {
      console.error('Error fetching quota info:', error);
      // Don't show error for quota fetch, just use default values
    } finally {
      setQuotaLoading(false);
    }
  };

  // Fetch quota info when component mounts
  useEffect(() => {
    fetchQuotaInfo();
  }, []);

  // --- Fetch Challenges Function (now using real API) ---
  const fetchChallengesData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const challengesData = await fetchChallenges();
      setChallenges(challengesData);
      
      // Smart loading: Check submission status for visible challenges with delays
      // This provides immediate feedback without overwhelming the server
      const challengeIds = challengesData.map(challenge => challenge.id);
      fetchSubmissionStatusesGradually(challengeIds);
      
    } catch (err) {
      console.error('AthleteChallengesView: Failed to fetch challenges:', err);
      
      if (err.message.includes('Authentication expired') || err.message.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(err.message || 'Failed to load challenges. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTouchStart = (e) => {
    if (selectedChallenge || loading) return;
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (selectedChallenge || loading) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - pullStartY);

    if (distance > 0 && window.scrollY === 0 && !selectedChallenge) {
      e.preventDefault();
      setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (selectedChallenge || loading) return;

    if (pullDistance >= PULL_THRESHOLD) {
      fetchChallengesData(true);
    }

    setPullDistance(0);
  };

  useEffect(() => {
    if (location.pathname === '/challenges' && location.key !== prevLocationKey.current && selectedChallenge) {
        setSelectedChallenge(null);
        setSubmissionStatus('idle');
        setVideoFile(null);
        setVideoError(null);
        setError(null);
    }
    prevLocationKey.current = location.key;
  }, [location.pathname, location.key, selectedChallenge]);

  useEffect(() => {
    fetchChallengesData();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (location.pathname === '/challenges') {
      fetchChallengesData(true);
    }
  }, [location.pathname]);

  // Add this useEffect to set up non-passive event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set up non-passive touch event listeners
    const handleTouchStartNonPassive = (e) => {
      handleTouchStart(e);
    };

    const handleTouchMoveNonPassive = (e) => {
      const touch = e.touches[0];
      const distance = touch.clientY - pullStartY;
      
      // 1. We have a valid start position
      // 2. We're pulling down (distance > 0)
      // 3. We're on the challenges list (not in detail view)
      if (distance > 0 && window.scrollY === 0 && !selectedChallenge) {
        e.preventDefault();
        setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
      } else {
        // Allow normal scrolling in all other cases
        setPullDistance(0);
      }
    };

    const handleTouchEndNonPassive = (e) => {
      handleTouchEnd(e);
    };

    // Add event listeners with passive: false
    container.addEventListener('touchstart', handleTouchStartNonPassive, { passive: false });
    container.addEventListener('touchmove', handleTouchMoveNonPassive, { passive: false });
    container.addEventListener('touchend', handleTouchEndNonPassive, { passive: false });

    // Cleanup function
    return () => {
      container.removeEventListener('touchstart', handleTouchStartNonPassive);
      container.removeEventListener('touchmove', handleTouchMoveNonPassive);
      container.removeEventListener('touchend', handleTouchEndNonPassive);
    };
  }, [selectedChallenge, loading, pullDistance]); // Add dependencies

  const handleChallengeClick = async (challengeId) => {
    setLoading(true);
    setError(null);
    
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }
      
      setSelectedChallenge(challenge);
      setVideoFile(null);
      setVideoError(null);
      
      // Lazy load: Check submission status only when viewing this challenge
      setSubmissionStatusLoading(prev => ({ ...prev, [challengeId]: true }));
      try {
        const submission = await checkSubmissionStatus(challengeId);
        setSubmissionStatuses(prev => ({
          ...prev,
          [challengeId]: submission
        }));
      } catch (submissionError) {
        console.error('Error checking submission status:', submissionError);
        // Don't block the UI if submission status check fails
      } finally {
        setSubmissionStatusLoading(prev => ({ ...prev, [challengeId]: false }));
      }
      
    } catch (err) {
      console.error('Error loading challenge:', err);
      setError(err.message || 'Failed to load challenge details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileChange = (e) => {
    setVideoFile(null);
    setVideoError(null);

    const file = e.target.files[0];

    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setVideoError('Unsupported video format. Please use MP4, WebM, or MOV.');
      e.target.value = null;
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoError(`Video file size exceeds ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)}MB.`);
      e.target.value = null;
      return;
    }

    setVideoFile(file);
  };

  const handleVideoSubmit = async () => {
    // Check quota before allowing submission
    if (quotaInfo && quotaInfo.current >= quotaInfo.max) {
      setQuotaErrorMessage(`Challenge submission quota exceeded. You can submit ${quotaInfo.max} challenge${quotaInfo.max > 1 ? 's' : ''} per ${quotaInfo.period}.`);
      setTimeout(() => { setQuotaErrorMessage(""); }, 2000);
      return;
    }
    if (!videoFile || !selectedChallenge) {
      setVideoError('Please select a video file to submit.');
      return;
    }
    if (videoError) {
      return;
    }

    setError(null);

    try {
      // Use the complete submission flow (upload tracking is now handled globally)
      await completeChallengeSubmission(
        selectedChallenge.id, 
        videoFile
      );

      // Call updateStreak after successful submission
      try {
        if (user && user.id) {
          await updateStreak(user.id);
        }
      } catch (streakErr) {
        console.error('Failed to update streak:', streakErr);
      }

      setVideoFile(null);

      // Update the submission status for this challenge
      const newSubmission = await checkSubmissionStatus(selectedChallenge.id);
      setSubmissionStatuses(prev => ({
        ...prev,
        [selectedChallenge.id]: newSubmission
      }));

      // Update quota info immediately after successful submission
      fetchQuotaInfo();

    } catch (err) {
      console.error('Video submission failed:', err);
      setError(err.message || 'Video submission failed. Please try again.');
    }
  };

  const checkSubmissionStatus = async (challengeId) => {
    try {
      const authState = useAuthStore.getState();
      const token = authState.isAuthenticated ? await authState.getValidIdToken() : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await apiClient.get(API_ENDPOINTS.checkSubmissionStatus(challengeId), { headers });
      return response.data?.submission || null;
    } catch (error) {
      if (error.response?.status === 404) {
        // No submission exists for this challenge/user, not an error
        return null;
      }
      // Only log and set error for real network/server errors
      console.error(`Error checking submission for challenge ${challengeId}:`, error);
      throw error; // Let the caller handle network/server errors
    }
  };

  const fetchSubmissionStatusesGradually = async (challengeIds) => {
    if (challengeIds.length === 0) return;
    
    setLoadingSubmissionStatuses(true);
    const delay = 150; // Slightly longer delay to be even more gentle

    for (let i = 0; i < challengeIds.length; i++) {
      const challengeId = challengeIds[i];
      try {
        const submission = await checkSubmissionStatus(challengeId);
        // Update the global submissionStatuses state immediately for each challenge
        setSubmissionStatuses(prev => ({
          ...prev,
          [challengeId]: submission
        }));
      } catch (error) {
        console.error(`Error checking submission for challenge ${challengeId}:`, error);
        // Set to null on error
        setSubmissionStatuses(prev => ({
          ...prev,
          [challengeId]: null
        }));
      }
      // Add a delay between requests to be gentle on the server
      if (i < challengeIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setLoadingSubmissionStatuses(false);
  };

  if (loading) {
    return (
      <div className="py-4 flex flex-col justify-center items-center bg-white" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <ChallengeLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <h1 className="text-xl font-bold text-red-500">Error: {error}</h1>
      </div>
    );
  }

  return (
    <div 
      className="py-4"
      ref={containerRef}
      style={{ 
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {pullDistance > 0 && (
        <div className="flex justify-center items-center py-4 text-gray-500">
          {pullDistance >= PULL_THRESHOLD ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
              Release to refresh
            </div>
          ) : (
            <div className="flex items-center">
              <div className="mr-2">↓</div>
              Pull down to refresh
            </div>
          )}
        </div>
      )}

      {refreshing && (
        <div className="flex justify-center items-center py-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
          Refreshing challenges...
        </div>
      )}

      {selectedChallenge ? (
        <div className="challenge-detail-view bg-white p-6 rounded-lg shadow-xl relative">
          <button
            onClick={() => { setSelectedChallenge(null); setSubmissionStatus('idle'); setVideoFile(null); setVideoError(null); }}
            className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-gray-800 rounded-xl shadow-lg hover:bg-white/30 transition-all duration-200 font-medium"
          >
            ← Back
          </button>

          <div className="pt-12">
            <h2 className="mb-3 text-red-600 text-center" style={{ fontFamily: '"Monoton", sans-serif', fontWeight: 400, fontSize: '2rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {selectedChallenge.title}
            </h2>

            {selectedChallenge?.image_url && (
              <div className="mb-4"><img src={selectedChallenge.image_url} alt={selectedChallenge.title} className="w-full max-h-64 object-cover rounded-lg" /></div>
            )}

            <p className="mb-3 text-gray-700"><strong>Description:</strong> {selectedChallenge.description}</p>

            {/* Coach Information in Detail View */}
            {selectedChallenge.coach_name && (
              <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-700">
                  <strong>Created by:</strong> {selectedChallenge.coach_name}
                </p>
              </div>
            )}

            <div className="video-upload-section bg-gray-50 border border-gray-200 p-5 rounded-lg">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Upload Your Video</h3>

              {/* Quota Information */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Daily Submission Quota</span>
                  </div>
                  {quotaLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <span className={`text-sm font-semibold ${quotaInfo?.current >= quotaInfo?.max ? 'text-red-600' : 'text-green-600'}`}>
                      {quotaInfo ? `${quotaInfo.current}/${quotaInfo.max}` : 'Loading...'}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {quotaInfo ? (
                    <>
                      {quotaInfo.isPremium ? 'Premium: 3 submissions per day' : 'Free: 1 submission per day'}
                      {quotaInfo.current >= quotaInfo.max && (
                        <div className="text-red-600 mt-1 font-medium">
                          Quota exceeded. Upgrade to Premium for more submissions.
                        </div>
                      )}
                    </>
                  ) : (
                    'Loading quota information...'
                  )}
                </div>
              </div>

              {videoError && <div className="text-red-600 mb-3">{videoError}</div>}

                {(() => {
                  const existingSubmission = submissionStatuses[selectedChallenge.id];
                  const hasSubmitted = existingSubmission !== null && existingSubmission !== undefined;
                  const uploadStatus = getUploadStatus(selectedChallenge.id);
                  const isLoadingSubmission = submissionStatusLoading[selectedChallenge.id];
                  
                  // Show loading state while checking submission status
                  if (isLoadingSubmission) {
                    return (
                      <div className="status-message text-red-700 font-bold mb-4 border border-red-300 p-4 rounded-lg bg-red-50 flex flex-col items-center justify-center">
                        <div className="flex items-center mb-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-2"></div>
                          <div>Checking submission status...</div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (hasSubmitted) {
                    return (
                      <div className="status-message text-red-700 font-bold mb-4 border border-red-300 p-4 rounded-lg bg-red-50 flex flex-col items-center justify-center">
                        <div className="flex items-center mb-2">
                          <span className="mr-2 text-2xl">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-600">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <div>Your video has been submitted!</div>
                        </div>
                        {/* Status pill styled like CoachChallengesView.jsx */}
                        {existingSubmission?.status === 'pending' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-gray-100 text-gray-500 border border-gray-300 flex items-center gap-1">
                            <svg className="inline-block mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Submitted
                          </span>
                        )}
                        {existingSubmission?.status === 'approved' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-white text-red-600 border-2 border-red-500">
                            Approved
                          </span>
                        )}
                        {existingSubmission?.status === 'denied' && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-500 text-white border-2 border-red-500">
                            Denied
                            </span>
                        )}
                        <div className="text-sm font-normal mt-1 text-gray-700">
                          Submitted: {existingSubmission?.submitted_at ? new Date(existingSubmission.submitted_at).toLocaleDateString() : 'N/A'}
                        </div>
                        {/* Coach's Comment (if any) */}
                        {existingSubmission?.review_comment && existingSubmission.review_comment.trim() !== '' && (
                          <div className="mt-2 w-full">
                            <div className="text-xs text-gray-500 font-semibold mb-1">Coach's Comment</div>
                            <div className="p-2 bg-gray-50 border-l-4 border-red-300 rounded text-gray-700 whitespace-pre-line text-sm break-words w-full">{existingSubmission.review_comment}</div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (uploadStatus) {
                    // Show upload progress from global store
                    return (
                      <div className="status-message text-red-700 font-bold mb-4 border border-red-300 p-4 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="mr-2 text-2xl">
                            {uploadStatus.status === 'uploading' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                            ) : uploadStatus.status === 'submitting' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-600">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <div className="flex-1 ml-2">
                            <div className="font-bold">
                              {uploadStatus.status === 'preparing' && 'Preparing upload...'}
                              {uploadStatus.status === 'uploading' && 'Uploading video...'}
                              {uploadStatus.status === 'submitting' && 'Submitting challenge...'}
                              {uploadStatus.status === 'completed' && 'Upload completed!'}
                              {uploadStatus.status === 'error' && 'Upload failed'}
                            </div>
                            {uploadStatus.error && (
                              <div className="text-sm font-normal text-red-600 mt-1">
                                Error: {uploadStatus.error}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        {(uploadStatus.status === 'uploading' || uploadStatus.status === 'submitting') && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-red-600 h-2 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadStatus.progress || 0}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {uploadStatus.status === 'uploading' && (
                          <div className="text-sm text-gray-600 mt-1 text-center">
                            {uploadStatus.progress || 0}% complete
                          </div>
                        )}
                        
                        {uploadStatus.status === 'submitting' && (
                          <div className="text-sm text-gray-600 mt-1 text-center">
                            Finalizing upload and submitting challenge...
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Show upload form
                    return (
                      <>
                        <div className="mb-4">
                          <label htmlFor="video-upload" className="block text-sm font-medium text-gray-700 mb-2">
                            Select Video File
                          </label>
                          <input
                            id="video-upload"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                          />
                        </div>

                        {videoFile && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm text-green-800">
                              <strong>Selected:</strong> {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          className="w-full bg-white text-red-600 border-2 border-red-500 hover:bg-red-100 font-bold py-3 rounded-full text-base uppercase transition-colors duration-200"
                          onClick={handleVideoSubmit}
                        >
                          Submit Challenge
                        </button>
                      </>
                    );
                  }
                })()}
              </div>
          </div>
        </div>
      ) : (
        <div className="challenges-list flex flex-col max-w-lg w-full mx-auto">
          {/* Loading indicator for submission statuses */}
          {loadingSubmissionStatuses && (
            <div className="flex items-center justify-center py-3 mb-4 text-gray-600 bg-gray-50 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
              <span className="text-sm">Loading submission statuses...</span>
            </div>
          )}
          
          {challenges.length === 0 ? (
            <p className="text-gray-600 col-span-full text-center">No challenges available at the moment.</p>
          ) : (
            challenges.map(challenge => {
              const submission = submissionStatuses[challenge.id];
              const hasSubmitted = submission !== null && submission !== undefined;
              const uploadStatus = getUploadStatus(challenge.id);
              
              return (
                <div
                  key={challenge.id}
                  onClick={() => handleChallengeClick(challenge.id)}
                  className={`challenge-card bg-white p-6 rounded-lg shadow-md mb-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                    hasSubmitted 
                      ? 'border-red-300 bg-red-50' 
                      : uploadStatus 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{challenge.title}</h3>
                    <span className="text-sm font-medium text-red-600">{challenge.xp_value} XP</span>
                  </div>
                  
                  {challenge.image_url && (
                    <div className="mb-2"><img src={challenge.image_url} alt={challenge.title} className="w-full max-h-48 object-cover rounded-lg" /></div>
                  )}
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{challenge.description}</p>
                  
                  {/* Coach Information */}
                  <div className="flex items-center mb-4">
                    {challenge.coach_profile_picture_url ? (
                      <img
                        src={challenge.coach_profile_picture_url}
                        alt={challenge.coach_name || 'Coach'}
                        className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mr-4"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-2xl mr-4">
                        <span>{challenge.coach_name && challenge.coach_name.trim() ? challenge.coach_name.trim().charAt(0).toUpperCase() : 'C'}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-xl text-gray-800">{challenge.coach_name || "Unknown"}</span>
                      <span className="ml-2 text-gray-500 text-base font-normal">Coach</span>
                    </div>
                  </div>
                  
                  {/* Submission Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {hasSubmitted ? (
                        <>
                          {/* Status pill for submission status */}
                          {submission?.status === 'pending' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-gray-100 text-gray-500 border border-gray-300 flex items-center gap-1">
                              <svg className="inline-block mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Submitted
                            </span>
                          )}
                          {submission?.status === 'approved' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-white text-red-600 border-2 border-red-500">
                              Approved
                            </span>
                          )}
                          {submission?.status === 'denied' && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-500 text-white border-2 border-red-500">
                              Denied
                          </span>
                          )}
                        </>
                      ) : uploadStatus ? (
                        <>
                          <span className="mr-1">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          </span>
                          <span className="text-sm font-medium text-red-700">
                            {uploadStatus.status === 'preparing' && 'Preparing...'}
                            {uploadStatus.status === 'uploading' && 'Uploading...'}
                            {uploadStatus.status === 'submitting' && 'Submitting...'}
                            {uploadStatus.status === 'completed' && 'Completed!'}
                            {uploadStatus.status === 'error' && 'Failed'}
                          </span>
                        </>
                      ) : loadingSubmissionStatuses ? (
                        <>
                          <span className="mr-1">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          </span>
                          <span className="text-sm text-gray-500">Checking...</span>
                        </>
                      ) : (
                        <>
                          <span className="mr-1 text-gray-400">○</span>
                          <span className="text-sm text-gray-500">Not Submitted</span>
                        </>
                      )}
                    </div>
                    
                    {uploadStatus && uploadStatus.status === 'uploading' && (
                      <div className="text-xs text-gray-500">
                        {uploadStatus.progress || 0}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {/* Quota Error Popup */}
      {quotaErrorMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
            {quotaErrorMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteChallengesView;
