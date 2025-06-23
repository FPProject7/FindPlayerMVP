import React, { useState, useEffect, useRef } from "react";
import challengeClient from "../../api/challengeApi";
import ReviewModal from "./ReviewModal";

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

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setActiveTab("post")}
          className={`flex-1 px-4 py-2 rounded font-semibold transition-colors duration-200 ${activeTab === "post" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          Post New Challenge
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`flex-1 px-4 py-2 rounded font-semibold transition-colors duration-200 ${activeTab === "view" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          View Athlete Submissions
        </button>
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
              Refreshing submissions...
            </div>
          )}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Athlete Submissions</h2>
          </div>
          {loading ? (
            <p>Loading submissions...</p>
          ) : (
            <div className="submissions-list grid grid-cols-1 gap-4">
              {submissions.length === 0 ? (
                <p className="text-gray-600 col-span-full text-center">No submissions yet.</p>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white p-5 rounded-lg shadow-md flex items-center space-x-4 mb-2 border border-gray-100 hover:shadow-lg transition-shadow duration-200 ease-in-out"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    {/* Profile picture avatar if present */}
                    {submission.athlete_profile_picture_url ? (
                      <img
                        src={submission.athlete_profile_picture_url}
                        alt={submission.athlete_name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl">
                        <span>{(submission.athlete_name || 'U').charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-lg text-gray-800 truncate">{submission.athlete_name || "Unknown"}</span>
                        {/* Status badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${submission.status === 'pending' ? 'bg-red-100 text-red-600' : submission.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Submitted at: {new Date(submission.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
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
        />
      )}
    </div>
  );
}
