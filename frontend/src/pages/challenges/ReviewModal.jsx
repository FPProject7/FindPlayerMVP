import React, { useState, useEffect } from "react";
import axios from "../../api/axiosConfig";
//import ReviewModal from "../../components/challenges/ReviewModal";

export default function CoachChallengesView() {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState("post");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    xp_value: "",
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "view") {
      fetchSubmissions();
    }
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/challenges");
      setSubmissions(response.data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/challenges", {
        title: formData.title,
        description: formData.description,
        xp_value: parseInt(formData.xp_value, 10),
      });
      alert("Challenge created successfully!");
      setFormData({ title: "", description: "", xp_value: "" });
    } catch (error) {
      console.error("Error creating challenge:", error);
      alert("Failed to create challenge. Please try again.");
    }
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setActiveTab("post")}
          className={`px-4 py-2 rounded ${
            activeTab === "post" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Post New Challenge
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`px-4 py-2 rounded ${
            activeTab === "view" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
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
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Athlete Submissions</h2>
            <button
              onClick={fetchSubmissions}
              className="text-sm text-blue-500"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p>Loading submissions...</p>
          ) : (
            <ul className="space-y-2">
              {submissions.length === 0 ? (
                <p>No submissions yet.</p>
              ) : (
                submissions.map((submission) => (
                  <li
                    key={submission.id}
                    className="border p-2 rounded shadow-sm cursor-pointer"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <p className="font-medium">
                      Submission #{submission.id} - {submission.status}
                    </p>
                    <p className="text-sm text-gray-600">
                      Submitted at: {submission.submitted_at}
                    </p>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <ReviewModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onApprove={(id, comment) => {
            console.log("Approved:", id, comment);
            // TODO: Integrate backend approve API
          }}
          onDeny={(id, comment) => {
            console.log("Denied:", id, comment);
            // TODO: Integrate backend deny API
          }}
        />
      )}
    </div>
  );
}
