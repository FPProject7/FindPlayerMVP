import React from 'react';
import './DeleteAccountModal.css';

function DeleteAccountModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="delete-account-modal-overlay" onClick={onClose}>
      <div className="delete-account-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="delete-account-modal-header">
          <div className="delete-account-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Delete Account</h2>
          <p>This action cannot be undone</p>
        </div>
        
        <div className="delete-account-modal-body">
          <p>
            Are you sure you want to permanently delete your account? This will:
          </p>
          <ul>
            <li>Remove all your posts, comments, and activity</li>
            <li>Delete your profile and personal information</li>
            <li>Remove you from all events and challenges</li>
            <li>Delete all your messages and conversations</li>
            <li>Permanently delete your account from our system</li>
          </ul>
          <p className="delete-account-warning">
            <strong>This action is permanent and cannot be reversed.</strong>
          </p>
        </div>

        <div className="delete-account-modal-actions">
          <button 
            className="delete-account-modal-cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="delete-account-modal-confirm" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="delete-account-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
