import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../api/axiosConfig';
import './EmailVerificationPage.css';

const schema = yup.object().shape({
  confirmationCode: yup
    .string()
    .required('Confirmation code is required')
    .matches(/^\d{6}$/, 'Confirmation code must be 6 digits'),
});

function EmailVerificationPage() {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    // Get email from location state or query params
    const stateEmail = location.state?.email;
    const urlParams = new URLSearchParams(location.search);
    const queryEmail = urlParams.get('email');
    
    const userEmail = stateEmail || queryEmail;
    if (userEmail) {
      setEmail(userEmail);
    } else {
      // If no email provided, redirect to signup
      navigate('/signup');
    }
  }, [location, navigate]);

  const onSubmit = async (data) => {
    setIsVerifying(true);
    setVerificationMessage('');

    try {
      const response = await api.post('/confirm-signup', {
        email: email,
        confirmationCode: data.confirmationCode
      });

      setVerificationSuccess(true);
      setVerificationMessage('Email verified successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationMessage(
        error.response?.data?.message || 
        'Verification failed. Please try again.'
      );
      reset(); // Clear the form
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      await api.post('/resend-confirmation', { email });
      setResendMessage('Confirmation code has been resent to your email.');
    } catch (error) {
      console.error('Resend error:', error);
      setResendMessage(
        error.response?.data?.message || 
        'Failed to resend code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return <div>Loading...</div>;
  }

  return (
    <div className="email-verification-container">
      <div className="email-verification-card">
        <div className="verification-header">
          <h1>Verify Your Email</h1>
          <p>We've sent a verification code to:</p>
          <p className="email-display">{email}</p>
        </div>

        {verificationSuccess ? (
          <div className="success-message">
            <p>{verificationMessage}</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="verification-form">
              <div className="form-group">
                <label htmlFor="confirmationCode">Enter 6-digit verification code:</label>
                <input
                  type="text"
                  id="confirmationCode"
                  placeholder="123456"
                  maxLength="6"
                  {...register('confirmationCode')}
                  className={errors.confirmationCode ? 'error' : ''}
                />
                {errors.confirmationCode && (
                  <span className="error-message">{errors.confirmationCode.message}</span>
                )}
              </div>

              {verificationMessage && (
                <div className={`message ${verificationMessage.includes('successfully') ? 'success' : 'error'}`}>
                  {verificationMessage}
                </div>
              )}

              <button 
                type="submit" 
                className="verify-button"
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="resend-section">
              <p>Didn't receive the code?</p>
              <button 
                onClick={handleResendCode}
                disabled={isResending}
                className="resend-button"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
              {resendMessage && (
                <div className={`message ${resendMessage.includes('resent') ? 'success' : 'error'}`}>
                  {resendMessage}
                </div>
              )}
            </div>

            <div className="back-to-signup">
              <button 
                onClick={() => navigate('/signup')}
                className="back-button"
              >
                Back to Sign Up
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmailVerificationPage; 