import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';
import api from '../../../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import LoadingDots from '../../common/LoadingDots';

function ResetPasswordSetNew({ email }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // <--- New loading state
  const navigate = useNavigate();

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const onSubmit = async (data) => {
    setApiError('');
    setSuccessMessage('');
    setIsLoading(true); // <--- Set loading to true at the start of submission
    console.log('Attempting to reset password for email:', email);

    try {
      const response = await api.post('/reset-password', {
        email: email,
        confirmationCode: data.code,
        password: data.password,
      });

      console.log('Password reset successful:', response.data);
      setSuccessMessage('Password reset. Please log in.');

      setTimeout(() => {
        navigate('/login');
        setIsLoading(false); // <--- Reset loading here after navigation
      }, 2000);

    } catch (err) {
      console.error('Error resetting password:', err);
      setApiError(
        err.response?.data?.message ||
        err.message ||
        'Failed to reset password. Please check code or try again.'
      );
    } finally {
      // If there's no setTimeout, this ensures isLoading is false immediately after API call.
      // With setTimeout, it's handled inside the timeout block.
      if (!successMessage) { // Only set false here if no success message (i.e., immediately on error)
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">Reset Your Password</h1>
      <p className="login-subtitle">Please check your email for a verification code.</p>

      <input
        type="text"
        placeholder="Verification Code"
        className="login-input"
        {...register('code', { required: 'Verification code is required' })}
      />
      {errors.code && <p className="login-error">{errors.code.message}</p>}

      {/* Password input with toggle icon */}
      <div className="password-input-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Reset Your Password..."
          className="login-input"
          {...register('password', {
            required: 'Password is required',
            pattern: {
              value: passwordPattern,
              message: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character',
            },
          })}
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

      {/* Verify Password input with toggle icon */}
      <div className="password-input-wrapper">
        <input
          type={showVerifyPassword ? 'text' : 'password'}
          placeholder="Verify Your Password..."
          className="login-input"
          {...register('verifyPassword', {
            required: 'Please verify your password',
            validate: value => value === password || 'Passwords do not match',
          })}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowVerifyPassword((v) => !v)}
          tabIndex={-1}
          aria-label={showVerifyPassword ? 'Hide verified password' : 'Show verified password'}
        >
          {showVerifyPassword ? (
            // Eye closed SVG for verify password
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.09-2.86 3.04-5.13 5.56-6.44M6.1 6.1A9.93 9.93 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-2.06 3.34M1 1l22 22" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            // Eye open SVG for verify password
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
              <ellipse cx="12" cy="12" rx="10" ry="6" stroke="#555" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="#555" strokeWidth="2"/>
            </svg>
          )}
        </button>
      </div>
      {errors.verifyPassword && <p className="login-error">{errors.verifyPassword.message}</p>}

      {apiError && <p className="login-error">{apiError}</p>}
      {successMessage && <p className="login-success-message">{successMessage}</p>}

      <button type="submit" className="login-button" disabled={isLoading}> {/* <--- Disable while loading */}
        {isLoading ? <LoadingDots /> : 'Continue'} {/* <--- Use LoadingDots component */}
      </button>
    </form>
  );
}

export default ResetPasswordSetNew;