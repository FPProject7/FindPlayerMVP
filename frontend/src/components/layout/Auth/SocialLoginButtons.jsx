import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import './SocialLoginButtons.css';

function SocialLoginButtons() {
  return (
    <div className="social-buttons">
      <button type="button" className="social-button">
        <FcGoogle className="social-icon" />
        Continue with Google
      </button>
      <button type="button" className="social-button black">
        <FaApple className="social-icon white" />
        Continue with Apple
      </button>
    </div>
  );
}

export default SocialLoginButtons;
