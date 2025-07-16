import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPromptModal.css';

function LoginPromptModal({ onClose, type = 'access' }) {
  const navigate = useNavigate();

  const handleLogin = () => {
    if (onClose) onClose();
    navigate('/login');
  };

  const handleSignup = () => {
    if (onClose) onClose();
    navigate('/signup');
  };

  const handleViewEvents = () => {
    if (onClose) onClose();
    navigate('/events');
  };

  // Different content based on modal type
  const getModalContent = () => {
    switch (type) {
      case 'expired':
        return {
          title: 'Session Expired',
          message: 'For your security, your login session has expired. Please log in again to continue.',
          showSignup: false, // Don't show signup for expired sessions
          primaryButtonText: 'Log In Again'
        };
      case 'access':
      default:
        return {
          title: 'Access Limited',
          message: 'You need to have an account to view this content.',
          showSignup: true,
          primaryButtonText: 'Log In'
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>{content.title}</h2>
        <p>{content.message}</p>

        <div className="modal-actions">
          <button className="modal-button" onClick={handleLogin}>
            {content.primaryButtonText}
          </button>
          {content.showSignup && (
            <button className="modal-button secondary" onClick={handleSignup}>
              Sign Up
            </button>
          )}
        </div>

        <button className="modal-view-events" onClick={handleViewEvents}>
          View Events
        </button>
      </div>
    </div>
  );
}

export default LoginPromptModal;
