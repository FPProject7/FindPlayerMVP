import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPromptModal.css';

function LoginPromptModal() {
  const navigate = useNavigate();

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Access Limited</h2>
        <p>You need to have an account to view this content.</p>

        <div className="modal-actions">
          <button className="modal-button" onClick={() => navigate('/login')}>Log In</button>
          <button className="modal-button" onClick={() => navigate('/signup')}>Sign Up</button>
        </div>

        <button className="modal-view-events" onClick={() => navigate('/events')}>
          View Events
        </button>
      </div>
    </div>
  );
}

export default LoginPromptModal;
