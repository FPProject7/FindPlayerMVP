// frontend/src/pages/challenges/AthleteChallengesView.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ChallengeLoader from '../../components/common/ChallengeLoader';
import { useAuthStore } from '../../stores/useAuthStore';
import { fetchChallenges, completeChallengeSubmission } from '../../api/challengeService';

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
  const { user, isAuthenticated, token } = useAuthStore();

  // --- Ref to track previous location key (for re-click detection) ---
  const prevLocationKey = React.useRef(location.key);
  const containerRef = useRef(null);

  // --- Pull to refresh constants ---
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
      
      console.log("AthleteChallengesView: Fetching challenges from API...");
      console.log("Auth state before fetch:", { isAuthenticated, hasToken: !!token });
      
      const challengesData = await fetchChallenges();
      setChallenges(challengesData);
      console.log("AthleteChallengesView: Challenges loaded successfully from API.");
      
    } catch (err) {
      console.error('AthleteChallengesView: Failed to fetch challenges:', err);
      
      // Handle authentication errors specifically
      if (err.message.includes('Authentication expired') || err.message.includes('Unauthorized')) {
        setError('Your session has expired. Please log in again.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else {
        setError(err.message || 'Failed to load challenges. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("AthleteChallengesView: Loading/refreshing completed.");
    }
  };

  // --- Pull to Refresh Handlers ---
  const handleTouchStart = (e) => {
    if (selectedChallenge || loading) return; // Don't allow pull when in detail view or loading
    
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (selectedChallenge || loading) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - pullStartY);
    
    // Only prevent default and handle pull-to-refresh if:
    // 1. We're at the top of the page (scrollY === 0)
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

  const handleTouchEnd = () => {
    if (selectedChallenge || loading) return;
    
    if (pullDistance >= PULL_THRESHOLD) {
      console.log("AthleteChallengesView: Pull to refresh triggered");
      fetchChallengesData(true);
    }
    
    setPullDistance(0);
  };

  // --- Effect to Reset Detail View on NavLink Re-click (main fix) ---
  useEffect(() => {
    // This effect runs whenever location.pathname or location.key changes.
    // We want to reset ONLY if:
    // 1. The path is currently '/challenges'
    // 2. The location.key has changed (indicating a new history entry, often from re-clicking NavLink)
    // 3. And a challenge is currently selected (meaning we are in the detail view)
    if (location.pathname === '/challenges' && location.key !== prevLocationKey.current && selectedChallenge) {
        console.log("AthleteChallengesView: NavLink re-click detected, resetting detail view.");
        setSelectedChallenge(null);
        setSubmissionStatus('idle');
        setVideoFile(null);
        setVideoError(null);
        setError(null);
    }
    // Always update the ref to the current key for the next render cycle
    prevLocationKey.current = location.key;
  }, [location.pathname, location.key, selectedChallenge]); // Include selectedChallenge so it re-checks if selection changes while on /challenges

  // --- Initial Load and Auto-refresh on Navigation ---
  useEffect(() => {
    console.log("AthleteChallengesView: useEffect triggered, starting fetchChallenges.");
    fetchChallengesData();
  }, []); // Empty dependency array means this runs once on mount

  // --- Auto-refresh when navigating to challenges page ---
  useEffect(() => {
    if (location.pathname === '/challenges') {
      console.log("AthleteChallengesView: Navigating to challenges page, refreshing data.");
      fetchChallengesData(true);
    }
  }, [location.pathname]);

  const handleChallengeClick = async (challengeId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find the challenge in the challenges array
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }
      
      setSelectedChallenge(challenge);
      setSubmissionStatus('idle');
      setVideoFile(null);
      setVideoError(null);
    } catch (err) {
      console.error('Failed to fetch challenge details:', err);
      setError('Failed to load challenge details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileChange = (e) => {
    setVideoFile(null);
    setVideoError(null);

    const file = e.target.files[0];

    if (!file) {
      return;
    }

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
      console.log("AthleteChallengesView: Starting challenge submission process...");
      
      // Use the complete submission flow (athlete_id will be extracted from JWT token)
      await completeChallengeSubmission(
        selectedChallenge.id, 
        videoFile
      );

      console.log("AthleteChallengesView: Challenge submission completed successfully");
      setSubmissionStatus('waiting_approval');
      setVideoFile(null);

    } catch (err) {
      console.error('Video submission failed:', err);
      setSubmissionStatus('idle');
      setError(err.message || 'Video submission failed. Please try again.');
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
      {/* Pull to refresh indicator */}
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

      {/* Refresh indicator */}
      {refreshing && (
        <div className="flex justify-center items-center py-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
          Refreshing challenges...
        </div>
      )}

      {error && <div className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</div>}

      {selectedChallenge ? (
        // --- Challenge Detail View ---
        <div className="challenge-detail-view bg-white p-6 rounded-lg shadow-xl relative">
          {/* Glassy Back Button */}
          <button
            onClick={() => { setSelectedChallenge(null); setSubmissionStatus('idle'); setVideoFile(null); setVideoError(null); }}
            className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-gray-800 rounded-xl shadow-lg hover:bg-white/30 transition-all duration-200 font-medium"
          >
            ← Back
          </button>

          <div className="pt-12">
              <h2 
                className="mb-3 text-red-600 text-center challenge-heading"
                style={{ 
                  fontFamily: '"Monoton", sans-serif',
                  fontWeight: "400",
                  fontStyle: "normal",
                  fontSize: "2rem",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}
              >
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
                ) : ( // Default state: idle or previous failed attempt (show upload controls)
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
                onClick={() => handleChallengeClick(challenge.id)}
              >
                {challenge.image_url && (
                  <img src={challenge.image_url} alt={challenge.title} className="w-full h-32 object-cover rounded-md mb-3" />
                )}
                <h3 className="font-bold text-lg mb-1 text-gray-800">{challenge.title}</h3>
                <p className="text-sm text-gray-600">{challenge.description.substring(0, 100)}...</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AthleteChallengesView;