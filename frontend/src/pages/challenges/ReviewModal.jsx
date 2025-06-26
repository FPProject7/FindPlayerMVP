import React, { useState } from "react";
import ReactDOM from "react-dom";
import ChallengeLoader from "../../components/common/ChallengeLoader";

function ReviewModal({ submission, onClose, onApprove, onDeny }) {
  const [comment, setComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const COMMENT_CHAR_LIMIT = 500;

  if (!submission) return null;

  const handleApprove = async () => {
    setIsReviewing(true);
    try {
      await onApprove(submission.id, comment);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDeny = async () => {
    setIsReviewing(true);
    try {
      await onDeny(submission.id, comment);
    } finally {
      setIsReviewing(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      style={{ background: 'transparent', padding: 0 }}
    >
      <div
        className="bg-white w-full max-w-[420px] mx-auto rounded-2xl shadow-2xl p-3 sm:p-6 relative flex flex-col max-h-[90vh]"
        style={{
          maxHeight: '90vh',
          minHeight: '60vh',
          left: 0,
          right: 0,
          bottom: 0,
          position: 'relative',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
          style={{ zIndex: 10 }}
        >
          ×
        </button>
        {/* Status pill only, no label */}
        {submission.status && (
          <div className="mb-3 flex items-center justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide
              ${submission.status === 'pending' ? 'bg-gray-100 text-gray-500 border border-gray-300' :
                submission.status === 'approved' ? 'bg-white text-red-600 border-2 border-red-500' :
                submission.status === 'denied' ? 'bg-red-500 text-white border-2 border-red-500' : 'bg-gray-100 text-gray-500 border border-gray-300'}`}
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
            className="w-full rounded mb-3 bg-black"
            style={{ maxHeight: 200 }}
          />
        ) : (
          <div className="w-full h-24 flex items-center justify-center bg-gray-100 rounded mb-3 text-gray-400">
            No video available
          </div>
        )}
        {/* Current review comment (if any) */}
        {submission.review_comment && submission.review_comment.trim() !== '' && (
          <div className="mb-2 p-2 bg-gray-50 border-l-4 border-red-300 rounded overflow-x-auto max-h-16 overflow-y-auto">
            <div className="text-xs text-gray-500 font-semibold mb-1">Previous comment</div>
            <div className="text-gray-700 whitespace-pre-line text-sm break-words max-w-full">{submission.review_comment}</div>
          </div>
        )}
        {/* Comment box */}
        <label className="block mb-1 text-sm font-medium text-gray-700">Coach's Comment</label>
        <textarea
          className="w-full border border-gray-300 rounded p-2 mb-1 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
          rows={3}
          placeholder="Write your feedback or comment here..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={COMMENT_CHAR_LIMIT}
        />
        <div className="text-xs text-gray-400 text-right mb-2">{comment.length}/{COMMENT_CHAR_LIMIT}</div>
        {/* Approve/Deny buttons */}
        <div className="flex flex-col items-center space-y-2 pt-2 pb-0 mb-2">
          <div className="flex w-full space-x-3">
            <button
              className="flex-1 bg-white text-red-600 border-2 border-red-500 hover:bg-red-100 font-bold py-2 rounded-full text-sm uppercase transition-colors duration-200"
              onClick={handleApprove}
              disabled={isReviewing}
            >
              APPROVE
            </button>
            <button
              className="flex-1 bg-red-100 text-red-600 border-2 border-red-500 hover:bg-red-200 font-bold py-2 rounded-full text-sm uppercase transition-colors duration-200"
              onClick={handleDeny}
              disabled={isReviewing}
            >
              DENY
            </button>
          </div>
          {isReviewing && (
            <div className="mt-2 flex justify-center items-center w-full">
              <ChallengeLoader />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ReviewModal;
