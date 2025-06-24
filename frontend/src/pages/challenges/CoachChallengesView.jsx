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
    xp_value: "",
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

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
      console.log('Submitting challenge to:', challengeClient.defaults.baseURL + '/challenges');
      const response = await challengeClient.post("/challenges", {
        title: formData.title,
        description: formData.description,
        xp_value: parseInt(formData.xp_value, 10),
      });
      console.log('Challenge created successfully:', response.data);
      alert("Challenge created successfully!");
      setFormData({ title: "", description: "", xp_value: "" });
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
      alert("Submission approved!");
      setSelectedSubmission(null);
      fetchSubmissions(); // Refresh list
    } catch (error) {
      alert("Failed to approve: " + (error.response?.data?.message || error.message));
    }
  };

  // Deny handler
  const handleDeny = async (submissionId, comment) => {
    try {
      await reviewSubmission(submissionId, "deny", comment);
      alert("Submission denied!");
      setSelectedSubmission(null);
      fetchSubmissions(); // Refresh list
    } catch (error) {
      alert("Failed to deny: " + (error.response?.data?.message || error.message));
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            placeholder="Challenge Title"
            className="w-full border p-2 rounded"
            required
          />
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Challenge Description"
            className="w-full border p-2 rounded"
            required
          />
          <input
            type="number"
            name="xp_value"
            value={formData.xp_value}
            onChange={handleFormChange}
            placeholder="XP Value"
            className="w-full border p-2 rounded"
            required
            min="1"
          />
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Submit
          </button>
        </form>
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
  );
}
