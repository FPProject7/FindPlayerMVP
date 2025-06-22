// frontend/src/pages/challenges/AthleteChallengesView.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ChallengeLoader from '../../components/common/ChallengeLoader';
import { fetchChallengesFromAPI } from '../../api/challenges'; // ✅ NEW: import real API helper

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

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
  const location = useLocation();

  const prevLocationKey = React.useRef(location.key);
  const containerRef = useRef(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  const fetchChallenges = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log("AthleteChallengesView: Fetching challenges...");

      const data = await fetchChallengesFromAPI();  // ✅ Use real API call
      setChallenges(data);
      console.log("AthleteChallengesView: Challenges loaded successfully.");

    } catch (err) {
      console.error('AthleteChallengesView: Failed to fetch challenges:', err);
      setError('Failed to load challenges. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("AthleteChallengesView: Loading/refreshing completed.");
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
      console.log("AthleteChallengesView: Pull to refresh triggered");
      fetchChallenges(true);
    }

    setPullDistance(0);
  };

  useEffect(() => {
    if (location.pathname === '/challenges' && location.key !== prevLocationKey.current && selectedChallenge) {
      console.log("AthleteChallengesView: NavLink re-click detected, resetting detail view.");
      setSelectedChallenge(null);
      setSubmissionStatus('idle');
      setVideoFile(null);
      setVideoError(null);
      setError(null);
    }
    prevLocationKey.current = location.key;
  }, [location.pathname, location.key, selectedChallenge]);

  useEffect(() => {
    console.log("AthleteChallengesView: useEffect triggered, starting fetchChallenges.");
    fetchChallenges();
  }, []);

  useEffect(() => {
    if (location.pathname === '/challenges') {
      console.log("AthleteChallengesView: Navigating to challenges page, refreshing data.");
      fetchChallenges(true);
    }
  }, [location.pathname]);

  const handleChallengeClick = async (challenge) => {
    try {
      setLoading(true);
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 500));
      setSelectedChallenge(challenge);
      setSubmissionStatus('idle');
      setVideoFile(null);
      setVideoError(null);
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
      console.log("Video file validation error present, preventing submission.");
      return;
    }

    setSubmissionStatus('uploading');
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmissionStatus('waiting_approval');
      setVideoFile(null);
    } catch (err) {
      console.error('Video submission failed:', err);
      setSubmissionStatus('idle');
      setError('Video submission failed. Please try again.');
    }
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

            {selectedChallenge.imageUrl && (
              <div className="challenge-image-container mb-4">
                <img src={selectedChallenge.imageUrl} alt={selectedChallenge.title} className="w-full h-48 object-cover rounded-lg shadow-md" />
              </div>
            )}

            <p className="mb-3 text-gray-700"><strong>Description:</strong> {selectedChallenge.description}</p>
            <p className="mb-5 text-gray-700"><strong>Instructions:</strong> {selectedChallenge.instructions}</p>

            <div className="video-upload-section bg-gray-50 border border-gray-200 p-5 rounded-lg">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Upload Your Video</h3>

              {videoError && <div className="text-red-600 mb-3">{videoError}</div>}

              {submissionStatus === 'waiting_approval' ? (
                <div className="status-message text-green-700 font-bold mb-4 border border-green-300 p-4 rounded-lg bg-green-50 flex items-center justify-center">
                  <span className="mr-2 text-2xl">✅</span> Your video is submitted and waiting for approval!
                </div>
              ) : submissionStatus === 'uploading' ? (
                <div className="status-message text-blue-700 font-bold mb-4 border border-blue-300 p-4 rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="mr-2 text-2xl">⏳</span> Uploading video... Please wait.
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="block w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-3"
                  />
                  {videoFile && <p className="text-sm text-gray-600 mb-3">Selected: {videoFile.name}</p>}
                  <button
                    onClick={handleVideoSubmit}
                    disabled={!videoFile}
                    className="submit-video-button mt-2 bg-red-500 text-white py-2 px-5 rounded-lg font-semibold hover:bg-red-600 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Video
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="challenges-list grid grid-cols-1 gap-4">
          {challenges.length === 0 ? (
            <p className="text-gray-600 col-span-full text-center">No challenges available at the moment.</p>
          ) : (
            challenges.map(challenge => (
              <div
                key={challenge.id}
                className="challenge-item bg-white p-5 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out"
                onClick={() => handleChallengeClick(challenge)}
              >
                {challenge.imageUrl && (
                  <img src={challenge.imageUrl} alt={challenge.title} className="w-full h-32 object-cover rounded-md mb-3" />
                )}
                <h3 className="font-bold text-lg mb-1 text-gray-800">{challenge.title}</h3>
                <p className="text-sm text-gray-600">{challenge.description?.substring(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AthleteChallengesView;
