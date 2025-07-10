import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPromptModal.css';

function LoginPromptModal({ onClose }) {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Access Limited</h2>
        <p>You need to have an account to view this content.</p>

        <div className="modal-actions">
          <button className="modal-button" onClick={handleLogin}>Log In</button>
          <button className="modal-button" onClick={handleSignup}>Sign Up</button>
        </div>

        <button className="modal-view-events" onClick={handleViewEvents}>
          View Events
        </button>
      </div>
    </div>
  );
}

export default LoginPromptModal;
