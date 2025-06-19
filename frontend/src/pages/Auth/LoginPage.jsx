import React from 'react';
import LoginForm from '../../components/layout/Auth/LoginForm';
import './LoginPage.css';

function LoginPage({ setIsAuthenticated }) {   // 👈 Accept setIsAuthenticated from App
  return (
    <div className="login-container">
      <div className="login-card">
        <LoginForm setIsAuthenticated={setIsAuthenticated} />  {/* 👈 Pass to LoginForm */}
      </div>
    </div>
  );
}

export default LoginPage;
