import React, { useState, useEffect, useRef } from "react";
import challengeClient, { reviewSubmission } from "../../api/challengeApi";
import ReviewModal from "./ReviewModal";
import ChallengeLoader from "../../components/common/ChallengeLoader";

export default function CoachChallengesView() {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState("post"); // 'post' or 'view'
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    xp_value: 1,
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;
  const [showSuccess, setShowSuccess] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(null); // { type: 'approve'|'deny', message: string }
  const [reviewError, setReviewError] = useState(null); // error message for review actions

  // Fetch submissions when view tab is active
  useEffect(() => {
    if (activeTab === "view") {
      fetchSubmissions();
    }
  }, [activeTab]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (loading) return;
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (loading) return;
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
    if (loading) return;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      fetchSubmissions(true);
    }
    setPullDistance(0);
  };

  // Modified fetchSubmissions to support refresh
  const fetchSubmissions = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      console.log('Fetching submissions from:', challengeClient.defaults.baseURL + '/submissions');
      const response = await challengeClient.get("/submissions");
      console.log("Fetched submissions:", response.data);
      setSubmissions(response.data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      alert(`Failed to fetch submissions: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await challengeClient.post("/challenges", {
        title: formData.title,
        description: formData.description,
        xp_value: parseInt(formData.xp_value, 10),
      });
      setShowSuccess(true);
      setFormData({ title: "", description: "", xp_value: 1 });
    } catch (error) {
      console.error("Error creating challenge:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      alert(`Failed to create challenge: ${error.response?.data?.message || error.message}`);
    }
  };

  // Approve handler
  const handleApprove = async (submissionId, comment) => {
    try {
      await reviewSubmission(submissionId, "approve", comment);
      setReviewSuccess({ type: 'approve', message: 'Submission approved!' });
      setSelectedSubmission(null);
      fetchSubmissions(); // Refresh list
    } catch (error) {
      setReviewError("Failed to approve: " + (error.response?.data?.message || error.message));
      setSelectedSubmission(null); // Always close modal on error
    }
  };

  // Deny handler
  const handleDeny = async (submissionId, comment) => {
    try {
      await reviewSubmission(submissionId, "deny", comment);
      setReviewSuccess({ type: 'deny', message: 'Submission denied!' });
      setSelectedSubmission(null);
      fetchSubmissions(); // Refresh list
    } catch (error) {
      setReviewError("Failed to deny: " + (error.response?.data?.message || error.message));
      setSelectedSubmission(null); // Always close modal on error
    }
  };

  // Attach non-passive event listeners for pull-to-refresh in the view tab
  useEffect(() => {
    if (activeTab !== 'view') return;
    const container = containerRef.current;
    if (!container) return;

    // Attach listeners with passive: false
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, loading, pullStartY, pullDistance]);

  return (
    <>
      {/* Review Success Popup */}
      {reviewSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full flex flex-col items-center">
            <span className="mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-red-500" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div className="text-lg font-semibold mb-2 text-gray-800 text-center">{reviewSuccess.message}</div>
            <button
              onClick={() => setReviewSuccess(null)}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Review Error Popup */}
      {reviewError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full flex flex-col items-center">
            <span className="mb-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-red-500" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <div className="text-lg font-semibold mb-2 text-gray-800 text-center">{reviewError}</div>
            <button
              onClick={() => setReviewError(null)}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="p-4 pt-24">
        {/* Fixed Tabs */}
        <div className="fixed top-16 left-0 right-0 z-50 px-4 py-3 pointer-events-none">
          <div className="flex space-x-4 max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => setActiveTab('post')}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors duration-200 shadow-md border border-white/30 backdrop-blur-md bg-white/30 ${activeTab === 'post' ? 'ring-2 ring-red-400 text-red-700' : 'text-gray-800'}`}
            >
              New Challenge
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors duration-200 shadow-md border border-white/30 backdrop-blur-md bg-white/30 ${activeTab === 'view' ? 'ring-2 ring-red-400 text-red-700' : 'text-gray-800'}`}
            >
              Athlete Submissions
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
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-800 text-base"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">Challenge Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Describe the challenge..."
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-800 text-base min-h-[80px]"
                required
              />
            </div>
            <div>
              <label htmlFor="xp_value" className="block text-sm font-semibold text-gray-700 mb-1">XP Value: <span className="font-bold text-red-500">{formData.xp_value}</span></label>
              <input
                type="range"
                id="xp_value"
                name="xp_value"
                min="1"
                max="5"
                value={formData.xp_value}
                onChange={handleFormChange}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors duration-200 text-lg"
            >
              Submit Challenge
            </button>
          </form>
        )}

        {/* Success Popup */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-xs w-full flex flex-col items-center">
              <span className="mb-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-red-500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div className="text-lg font-semibold mb-2 text-gray-800 text-center">Challenge successfully created!</div>
              <button
                onClick={() => setShowSuccess(false)}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* View Submissions */}
        {activeTab === "view" && (
          <div
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
                Refreshing submissions...
              </div>
            )}
            {loading ? (
              <div className="py-4 flex flex-col justify-center items-center bg-white" style={{ minHeight: 'calc(100vh - 120px)' }}>
                <ChallengeLoader />
              </div>
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
          </div>
        )}

        {/* Review Modal if needed */}
        {selectedSubmission && (
          <ReviewModal
            submission={selectedSubmission}
            onClose={() => setSelectedSubmission(null)}
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        )}
      </div>
    </>
  );
}
