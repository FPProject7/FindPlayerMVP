import React from 'react';
import LoginForm from '../../components/layout/Auth/LoginForm';
import './LoginPage.css';  // ✅ add this (create LoginPage.css in the same folder)

function LoginPage() {
  return (
    <div className="login-container">
      <div className="login-card">
        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;
