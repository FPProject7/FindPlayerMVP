import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import './SocialLoginButtons.css';

function SocialLoginButtons() {
  return (
    <div className="social-buttons">
      <button type="button" className="social-button">
        <FcGoogle className="social-icon" />
        Continue with Google
      </button>
    </div>
  );
}

export default SocialLoginButtons;
