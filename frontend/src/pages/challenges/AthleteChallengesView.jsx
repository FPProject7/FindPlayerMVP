// frontend/src/pages/challenges/AthleteChallengesView.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ChallengeLoader from '../../components/common/ChallengeLoader';
import { useAuthStore } from '../../stores/useAuthStore';
import { fetchChallenges, completeChallengeSubmission } from '../../api/challengeService';
import apiClient from '../../api/axiosConfig';
import useUploadStore from '../../stores/useUploadStore';

// --- Mock Data for Challenge List ---
const MOCK_CHALLENGES = [
  {
    id: 'c1',
    title: 'Sprint Challenge',
    description: 'Run 100m in under 12 seconds.',
    instructions: 'Record your sprint. Ensure clear start and finish lines.',
    status: 'open',
    imageUrl: 'https://picsum.photos/seed/sprint/150/150'
  },
  {
    id: 'c2',
    title: 'Vertical Jump Test',
    description: 'Jump as high as you can to measure explosive power.',
    instructions: 'Measure your standing reach. Jump and touch the highest point you can reach. Record your attempt.',
    status: 'open',
    imageUrl: 'https://picsum.photos/seed/jump/150/150'
  },
  {
    id: 'c3',
    title: 'Dribbling Drill',
    description: 'Complete the cone dribbling course under 30 seconds.',
    instructions: 'Set up 5 cones in a zigzag pattern. Dribble through them. Record the entire drill.',
    status: 'open',
    imageUrl: 'https://picsum.photos/seed/dribble/150/150'
  },
  {
    id: 'c4',
    title: 'Push-up Max',
    description: 'Perform as many push-ups as possible with proper form.',
    instructions: 'Keep your body straight. Lower until chest touches floor. Record full range of motion.',
    status: 'open',
    imageUrl: 'https://picsum.photos/seed/pushup/150/150'
  },
  {
    id: 'c5',
    title: 'Long Jump',
    description: 'Measure your horizontal explosive power from a standing start.',
    instructions: 'Stand behind a line. Jump forward as far as you can. Measure distance. Record attempt.',
    status: 'open',
    imageUrl: 'https://picsum.photos/seed/longjump/150/150'
  },
];

// --- Mock Data for Specific Challenge Detail ---
const MOCK_CHALLENGE_DETAILS = {
  'c1': { id: 'c1', title: 'Sprint Challenge', description: 'This challenge tests your raw speed over a short distance. Focus on explosive power from the blocks or standing start. Develop muscle memory for efficient stride length and frequency. Improves overall acceleration and top speed.', instructions: '1. Find a flat, clear 100-meter space (track or open field). 2. Set up clear start and finish markers. 3. Use a reliable timer (e.g., a friend with a stopwatch). 4. Record your sprint from a side angle (hip to head visible) to show form and technique. 5. Upload the video. Max video length 30s. Ensure lighting is adequate and you are clearly visible.', imageUrl: 'https://picsum.photos/seed/sprint-detail/400/250' },
  'c2': { id: 'c2', title: 'Vertical Jump Test', description: 'Measure your explosive leg power. A higher jump indicates greater athletic potential for quick movements, crucial in sports like basketball, volleyball, or high-jump.', instructions: '1. Stand next to a wall or measuring device, flat-footed. 2. Mark your standing reach with your arm fully extended overhead. 3. Jump vertically as high as you can, touching the highest point possible. 4. Record your jump from a side angle, ensuring both your standing reach and jump height are visible. 5. Upload the video. Max video length 15s. Take 3 attempts and submit your best.', imageUrl: 'https://picsum.photos/seed/jump-detail/400/250' },
  'c3': { id: 'c3', title: 'Dribbling Drill', description: 'Evaluate your ball control and agility. Essential for changing direction quickly while maintaining possession, vital for players in team sports like basketball or soccer.', instructions: '1. Set up 5 cones 3 meters apart in a straight line or zigzag pattern. 2. Dribble the ball (football or basketball) through the cones as fast as possible, making sure not to touch any cones. 3. Record the drill from a high angle or from behind to clearly show the entire course. 4. Upload the video. Max video length 45s. Focus on tight control and quick turns.', imageUrl: 'https://picsum.photos/seed/dribble-detail/400/250' },
  'c4': { id: 'c4', title: 'Push-up Max', description: 'Measure your explosive leg power. A higher jump indicates greater athletic potential for quick movements, crucial in sports like basketball, volleyball, or high-jump.', instructions: '1. Stand next to a wall or measuring device, flat-footed. 2. Mark your standing reach with your arm fully extended overhead. 3. Jump vertically as high as you can, touching the highest point possible. 4. Record your jump from a side angle, ensuring both your standing reach and jump height are visible. 5. Upload the video. Max video length 15s. Take 3 attempts and submit your best.', imageUrl: 'https://picsum.photos/seed/pushup-detail/400/250' },
  'c5': { id: 'c5', title: 'Long Jump', description: 'Evaluate your ball control and agility. Essential for changing direction quickly while maintaining possession, vital for players in team sports like basketball or soccer.', instructions: '1. Set up 5 cones 3 meters apart in a straight line or zigzag pattern. 2. Dribble the ball (football or basketball) through the cones as fast as possible, making sure not to touch any cones. 3. Record the drill from a high angle or from behind to clearly show the entire course. 4. Upload the video. Max video length 45s. Focus on tight control and quick turns.', imageUrl: 'https://picsum.photos/seed/longjump-detail/400/250' },
};

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

// API endpoint URLs
const API_ENDPOINTS = {
  submitChallenge: (challengeId) => `https://stpw2c9b5b.execute-api.us-east-1.amazonaws.com/default/challenges/${challengeId}/submit`,
  checkSubmissionStatus: (challengeId) => `https://bv6tkoez9f.execute-api.us-east-1.amazonaws.com/default/challenges/${challengeId}/checkSubmissionStatus`
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

  const prevLocationKey = React.useRef(location.key);
  const containerRef = useRef(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

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
      
      // Re-enable submission status checking with the new endpoint
      const challengeIds = challengesData.map(challenge => challenge.id);
      await fetchSubmissionStatuses(challengeIds);
      
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

      // Check if user has already submitted using stored status
      const submission = submissionStatuses[challengeId];
      if (submission) {
        setSubmissionStatus('already_submitted');
      } else {
        setSubmissionStatus('idle');
      }
      
    } catch (err) {
      console.error('Failed to load challenge details:', err);
      setError('Failed to load challenge details. Please try again.');
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

      setVideoFile(null);

      // Update the submission status for this challenge
      const newSubmission = await checkSubmissionStatus(selectedChallenge.id);
      setSubmissionStatuses(prev => ({
        ...prev,
        [selectedChallenge.id]: newSubmission
      }));

    } catch (err) {
      console.error('Video submission failed:', err);
      setError(err.message || 'Video submission failed. Please try again.');
    }
  };

  const checkSubmissionStatus = async (challengeId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.checkSubmissionStatus(challengeId));
      return response.data?.submission || null;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No submission exists
      }
      console.error(`Error checking submission for challenge ${challengeId}:`, error);
      return null;
    }
  };

  const fetchSubmissionStatuses = async (challengeIds) => {
    const statuses = {};
    
    // Check submission status for each challenge
    for (const challengeId of challengeIds) {
      const submission = await checkSubmissionStatus(challengeId);
      statuses[challengeId] = submission;
    }
    
    setSubmissionStatuses(statuses);
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

              {selectedChallenge.image_url && (
                <div className="challenge-image-container mb-4">
                  <img 
                    src={selectedChallenge.image_url} 
                    alt={selectedChallenge.title}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  />
                </div>
              )}

              <p className="mb-3 text-gray-700"><strong>Description:</strong> {selectedChallenge.description}</p>
              <p className="mb-5 text-gray-700"><strong>Instructions:</strong> {selectedChallenge.instructions}</p>

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

              {videoError && <div className="text-red-600 mb-3">{videoError}</div>}

                {(() => {
                  const existingSubmission = submissionStatuses[selectedChallenge.id];
                  const hasSubmitted = existingSubmission !== null && existingSubmission !== undefined;
                  const uploadStatus = getUploadStatus(selectedChallenge.id);
                  
                  if (hasSubmitted) {
                    return (
                      <div className="status-message text-red-700 font-bold mb-4 border border-red-300 p-4 rounded-lg bg-red-50 flex items-center justify-center">
                        <span className="mr-2 text-2xl">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-600">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span> 
                        <div>
                          <div>Your video has been submitted!</div>
                          <div className="text-sm font-normal mt-1">
                            Status: {existingSubmission?.status || 'Submitted'} | 
                            Submitted: {existingSubmission?.submitted_at ? new Date(existingSubmission.submitted_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
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
                          onClick={handleVideoSubmit}
                          disabled={!videoFile || submissionStatus === 'uploading'}
                          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
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
        <div className="challenges-list grid grid-cols-1 gap-4">
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
                  className={`challenge-card bg-white p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
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
                          <span className="mr-1 text-red-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className="text-sm font-medium text-red-700">Submitted</span>
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
    </div>
  );
};

export default AthleteChallengesView;
