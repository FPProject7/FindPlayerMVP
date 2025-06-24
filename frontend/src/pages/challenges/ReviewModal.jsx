import React, { useState } from "react";

function ReviewModal({ submission, onClose, onApprove, onDeny }) {
  const [comment, setComment] = useState("");

  if (!submission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Review Submission</h2>
        {/* Current Status */}
        {submission.status && (
          <div className="mb-4 flex items-center">
            <span className="font-semibold text-gray-700 mr-2">Current status:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold 
              ${submission.status === 'pending' ? 'bg-gray-100 text-gray-500' : 
                submission.status === 'approved' ? 'bg-green-100 text-green-600' : 
                submission.status === 'denied' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}
            >
              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
            </span>
          </div>
        )}
        {/* Video */}
        {submission.video_url ? (
          <video
            src={submission.video_url}
            controls
            className="w-full rounded mb-4 bg-black"
            style={{ maxHeight: 240 }}
          />
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded mb-4 text-gray-400">
            No video available
          </div>
        )}
        {/* Comment box */}
        <label className="block mb-2 text-sm font-medium text-gray-700">Coach's Comment</label>
        <textarea
          className="w-full border border-gray-300 rounded p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
          rows={3}
          placeholder="Write your feedback or comment here..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        {/* Approve/Deny buttons */}
        <div className="flex space-x-4">
          <button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded transition-colors duration-200"
            onClick={() => onApprove(submission.id, comment)}
          >
            Approve
          </button>
          <button
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded transition-colors duration-200"
            onClick={() => onDeny(submission.id, comment)}
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;
