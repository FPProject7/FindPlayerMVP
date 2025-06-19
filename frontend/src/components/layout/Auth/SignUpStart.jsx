import React from 'react';
import './SignUp.css';  // We'll add this CSS next
import loginLogo from '../../../assets/login-logo.jpg';
import { Link } from 'react-router-dom';

function SignUpStart({ onSelectRole, onLogin }) {
  return (
    <div className="form-box">
      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">Sign up to The Movement</h1>
      <p className="login-subtitle">Tell us more about who you are....</p>

      <select
        className="login-input"
        defaultValue=""
        onChange={(e) => onSelectRole(e.target.value)}
      >
        <option value="" disabled>I am a/an...</option>
        <option value="athlete">Athlete</option>
        <option value="coach">Coach</option>
        <option value="scout">Scout</option>
      </select>

      <p className="login-link">
  Already Have An Account? <Link to="/login" className="login-highlight">LOG IN</Link>
</p>
    </div>
  );
}

export default SignUpStart;
