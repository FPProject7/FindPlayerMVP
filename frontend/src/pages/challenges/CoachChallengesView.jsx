import React, { useState, useEffect, useRef } from "react";
import challengeClient, { reviewSubmission } from "../../api/challengeApi";
import ChallengeLoader from "../../components/common/ChallengeLoader";
import ReviewModal from "./ReviewModal";

const COACH_CHALLENGES_ENDPOINT = "https://a81zemot63.execute-api.us-east-1.amazonaws.com/default/coach/challenges";

export default function CoachChallengesView() {
  const [activeTab, setActiveTab] = useState("post");
  const [formData, setFormData] = useState({ title: "", description: "", xp_value: 1 });
  const [challenges, setChallenges] = useState([]); // List of coach's challenges
  const [selectedChallenge, setSelectedChallenge] = useState(null); // Challenge object
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState(null);
  const [submissions, setSubmissions] = useState([]); // Submissions for selected challenge
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(null);
  const containerRef = useRef(null);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Character limits
  const TITLE_CHAR_LIMIT = 50;
  const DESC_CHAR_LIMIT = 500;
  const COMMENT_CHAR_LIMIT = 500;

  // Fetch coach's challenges
  const fetchChallenges = async () => {
    setChallengeLoading(true);
    setChallengeError(null);
    try {
      const response = await challengeClient.get(COACH_CHALLENGES_ENDPOINT);
      setChallenges(response.data);
    } catch (error) {
      setChallengeError(error.response?.data?.message || error.message);
    } finally {
      setChallengeLoading(false);
    }
  };

  // Fetch submissions for a specific challenge
  const fetchSubmissions = async (challengeId) => {
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const response = await challengeClient.get(`https://g7gxu1k91k.execute-api.us-east-1.amazonaws.com/default/checkSubmissionStatus/${challengeId}`);
      setSubmissions(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (error) {
      setSubmissionsError(error.response?.data?.message || error.message);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (activeTab === "view") {
      fetchChallenges();
      setSelectedChallenge(null);
      setSubmissions([]);
    }
  }, [activeTab]);

  // Pull-to-refresh for challenges
  const handleTouchStart = (e) => {
    if (challengeLoading) return;
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };
  const handleTouchMove = (e) => {
    if (challengeLoading) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - pullStartY);
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
    } else {
      setPullDistance(0);
    }
  };
  const handleTouchEnd = () => {
    if (challengeLoading) return;
    if (pullDistance >= PULL_THRESHOLD) {
      fetchChallenges();
    }
    setPullDistance(0);
  };
  useEffect(() => {
    if (activeTab !== 'view') return;
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, challengeLoading, pullStartY, pullDistance]);

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle new challenge submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.title.length > TITLE_CHAR_LIMIT) {
      setErrorMessage(`Title cannot exceed ${TITLE_CHAR_LIMIT} characters.`);
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    if (formData.description.length > DESC_CHAR_LIMIT) {
      setErrorMessage(`Description cannot exceed ${DESC_CHAR_LIMIT} characters.`);
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    try {
      const response = await challengeClient.post("/challenges", {
        title: formData.title,
        description: formData.description,
        xp_value: parseInt(formData.xp_value, 10),
      });
      setFormData({ title: "", description: "", xp_value: 1 });
      // Optionally refresh challenge list if on view tab
      if (activeTab === "view") fetchChallenges();
      setSuccessMessage("Challenge created!");
      setTimeout(() => setSuccessMessage(""), 1200);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message);
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  // Handle submission approval
  const handleApprove = async (submissionId, comment) => {
    if (comment.length > COMMENT_CHAR_LIMIT) {
      setErrorMessage(`Comment cannot exceed ${COMMENT_CHAR_LIMIT} characters.`);
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    try {
      await reviewSubmission(submissionId, "approve", comment);
      fetchSubmissions(selectedChallenge.id);
      setSuccessMessage("Review approved!");
      setSelectedSubmission(null);
      setTimeout(() => setSuccessMessage(""), 1200);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message);
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  // Handle submission denial
  const handleDeny = async (submissionId, comment) => {
    if (!comment || comment.trim() === "") {
      setErrorMessage("Please provide a comment to deny a submission.");
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    if (comment.length > COMMENT_CHAR_LIMIT) {
      setErrorMessage(`Comment cannot exceed ${COMMENT_CHAR_LIMIT} characters.`);
      setTimeout(() => setErrorMessage(""), 2000);
      return;
    }
    try {
      await reviewSubmission(submissionId, "deny", comment);
      fetchSubmissions(selectedChallenge.id);
      setSuccessMessage("Review denied!");
      setSelectedSubmission(null);
      setTimeout(() => setSuccessMessage(""), 1200);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message);
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  // UI rendering
  return (
    <div className="p-4 pt-24">
      {/* Centered Success Message Notification */}
      {successMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
            {successMessage}
          </div>
        </div>
      )}
      {/* Centered Error Message Notification */}
      {errorMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-red-700 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
            {errorMessage}
          </div>
        </div>
      )}
      {/* Fixed Tabs */}
      <div className="fixed top-16 left-0 right-0 z-50 px-4 py-3 pointer-events-none">
        <div className="flex space-x-4 max-w-lg w-full mx-auto pointer-events-auto">
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors duration-200 shadow-md border border-white/30 backdrop-blur-md bg-white/30 ${activeTab === 'post' ? 'ring-2 ring-red-400 text-red-700' : 'text-gray-800'}`}
          >
            New Challenge
          </button>
          <button
            onClick={() => {
              if (selectedChallenge) {
                setSelectedChallenge(null);
                setSubmissions([]);
              }
              setActiveTab('view');
            }}
            className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors duration-200 shadow-md border border-white/30 backdrop-blur-md bg-white/30 ${activeTab === 'view' ? 'ring-2 ring-red-400 text-red-700' : 'text-gray-800'}`}
          >
            My Challenges
          </button>
        </div>
      </div>

      {/* Post Challenge Form */}
      {activeTab === "post" && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">Challenge Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="Enter challenge title"
              maxLength={TITLE_CHAR_LIMIT}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-800 text-base"
              required
            />
            <div className="text-xs text-gray-400 text-right">{formData.title.length}/{TITLE_CHAR_LIMIT}</div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">Challenge Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Describe the challenge..."
              maxLength={DESC_CHAR_LIMIT}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-800 text-base min-h-[80px]"
              required
            />
            <div className="text-xs text-gray-400 text-right">{formData.description.length}/{DESC_CHAR_LIMIT}</div>
          </div>
          <div>
            <div className="block text-base font-bold text-red-500 mb-1">{formData.xp_value} XP</div>
            <input
              type="range"
              id="xp_value"
              name="xp_value"
              min="1"
              max="5"
              value={formData.xp_value}
              onChange={handleFormChange}
              className="w-full focus:outline-none focus:ring-2 focus:ring-red-400 accent-red-500"
              style={{ accentColor: '#ef4444' }}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white text-red-600 border-2 border-red-500 hover:bg-red-100 font-bold py-3 rounded-full text-base uppercase transition-colors duration-200"
          >
            Submit Challenge
          </button>
        </form>
      )}

      {/* Grouped Challenge List View */}
      {activeTab === "view" && (
        <div ref={containerRef} className="max-w-lg w-full mx-auto" style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none' }}>
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
          {challengeLoading ? (
            <div className="py-4 flex flex-col justify-center items-center bg-white" style={{ minHeight: 'calc(100vh - 120px)' }}>
              <ChallengeLoader />
            </div>
          ) : challengeError ? (
            <div className="py-4 text-center text-red-600">{challengeError}</div>
          ) : selectedChallenge ? (
            <>
              {/* Removed 'Back to Challenges' button. Navigation handled by 'My Challenges' tab. */}
              {submissionsLoading ? (
                <ChallengeLoader />
              ) : submissionsError ? (
                <div className="text-red-600">{submissionsError}</div>
              ) : (
                <div className="submissions-list flex flex-col">
                  {submissions.length === 0 ? (
                    <p className="text-gray-600 col-span-full text-center">No submissions yet.</p>
                  ) : (
                    submissions.map((submission) => {
                      const profilePicUrl = submission.athlete_profile_picture_url || submission.profilePictureUrl;
                      return (
                        <div
                          key={submission.id}
                          className={`challenge-card bg-white p-6 rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg mb-6
                            ${submission.status === 'pending' ? 'border-none' : (submission.status === 'approved' || submission.status === 'denied') ? 'border-2 border-red-300' : 'border-2 border-gray-200'}
                          `}
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <div className="flex items-center mb-4">
                            {profilePicUrl ? (
                              <img
                                src={profilePicUrl}
                                alt={submission.athlete_name}
                                className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mr-4"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-2xl mr-4">
                                <span>{(submission.athlete_name || 'U').charAt(0)}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <span className="font-bold text-xl text-gray-800 mr-2">{submission.athlete_name || "Unknown"}</span>
                              {submission.status === 'approved' && (
                                <span className="mr-1 text-red-600">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )}
                              {submission.status === 'denied' && (
                                <span className="mr-1 text-red-600">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )}
                              <span className={`ml-1 px-3 py-1 rounded-full text-sm font-semibold
                                ${submission.status === 'pending' ? 'bg-gray-100 text-gray-500' : (submission.status === 'approved' || submission.status === 'denied') ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}
                              `}>
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-600 text-sm">
                            Submitted at: {new Date(submission.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {selectedSubmission && (
                <ReviewModal
                  submission={selectedSubmission}
                  onClose={() => setSelectedSubmission(null)}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                />
              )}
            </>
          ) : (
            <div className="challenges-list flex flex-col">
              {challenges.length === 0 ? (
                <p className="text-gray-600 col-span-full text-center">No challenges posted yet.</p>
              ) : (
                challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className="challenge-card bg-white p-6 rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg mb-6 border-2 border-gray-200"
                    onClick={() => { setSelectedChallenge(challenge); fetchSubmissions(challenge.id); }}
                  >
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 mr-4">{challenge.title}</h3>
                      <span className="ml-auto text-sm font-medium text-red-600">{challenge.xp_value} XP</span>
                    </div>
                    <div className="text-gray-600 text-sm mb-2">{challenge.description}</div>
                    <div className="flex items-center text-gray-500 text-xs">
                      <span className="mr-2">Submissions:</span>
                      <span className="font-bold text-red-600">{challenge.submission_count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
