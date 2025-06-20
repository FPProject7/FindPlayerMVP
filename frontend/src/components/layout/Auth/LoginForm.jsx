import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import SocialLoginButtons from './SocialLoginButtons';
import './LoginForm.css';
import loginLogo from '../../../assets/login-logo.jpg';
import { Link, useNavigate } from 'react-router-dom'; // <--- Added useNavigate
import api from '../../../api/axiosConfig';
import { useAuthStore } from '../../../stores/useAuthStore'; // <--- Import your auth store

// Validation schema
const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate(); // <--- Initialize useNavigate
  const login = useAuthStore((state) => state.login); // <--- Get the login action from your store

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setApiError(''); // Clear previous errors
    try {
      const response = await api.post('/signin', {
        email: data.email,
        password: data.password,
      });

      // --- IMPORTANT: Adjust these lines based on your actual backend response ---
      // Assuming your backend returns data like: { idToken: '...', userProfile: { name: '...', email: '...' } }
      const { idToken, userProfile } = response.data;

      // 1. Call your store's login action to save token and user info
      login(userProfile, { IdToken: idToken }); // Ensure params match your useAuthStore.js `login` signature

      // 2. Redirect to the main app page
      navigate('/home'); // Or '/' or whatever your main authenticated route is

    } catch (err) {
      // Improved error handling for common API responses
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please check your credentials and try again.';
      setApiError(errorMessage);
    } finally {
        // You might want to clear errors here if you have a separate "loading" state
        // or if you want to ensure the error message disappears on subsequent attempts.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="login-header">
        <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
        <h1 className="login-title">FindPlayer</h1>
        <p className="login-subtitle bold">Log Into Your Account</p>
        <p className="login-subtitle">Enter your email to sign up to the MOVEMENT</p>
      </div>

      <div className="input-group">
        <input
          type="email"
          placeholder="Email..."
          className="login-input"
          {...register('email')}
        />
        {errors.email && <p className="login-error">{errors.email.message}</p>}
      </div>

      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password..."
          className="login-input"
          {...register('password')}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword((v) => !v)}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            // Eye closed SVG
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.09-2.86 3.04-5.13 5.56-6.44M6.1 6.1A9.93 9.93 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-2.06 3.34M1 1l22 22" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            // Eye open SVG
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
              <ellipse cx="12" cy="12" rx="10" ry="6" stroke="#555" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="#555" strokeWidth="2"/>
            </svg>
          )}
        </button>
      </div>
      {errors.password && <p className="login-error">{errors.password.message}</p>}
      {apiError && <p className="login-error">{apiError}</p>}

      <button type="submit" className="login-button">
        Continue
      </button>

      <div className="login-links center">
        <Link to="/reset-password" className="forgot">FORGOT YOUR PASSWORD?</Link>
      </div>

      <div className="login-or">
        <div className="line"></div>
        <span>or</span>
        <div className="line"></div>
      </div>

      <div className="login-links center">
        <span>Don't Have An Account?</span>
        <Link to="/signup" className="signup">SIGN UP</Link>
      </div>

      <SocialLoginButtons />

      <p className="login-terms">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>
    </form>
  );
}

export default LoginForm;