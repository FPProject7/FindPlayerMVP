import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';
import api from '../../../api/axiosConfig';

function ResetPasswordStart({ onContinue }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const email = watch('email');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const [apiError, setApiError] = useState('');

  const onSubmit = async (data) => {
    setApiError('');
    console.log('Attempting to send reset code for email:', data.email);

    try {
      const response = await api.post('/forgot-password', {
        email: data.email,
      });

      console.log('Reset code request successful:', response.data);
      // alert('Verification code sent to your email!'); // <--- REMOVED THIS LINE

      // Proceed to the next step, passing the email
      onContinue(data.email);

    } catch (err) {
      console.error('Error requesting reset code:', err);
      setApiError(
        err.response?.data?.message ||
        err.message ||
        'Failed to send verification code. Please check your email or try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">FindPlayer</h1>
      <p className="login-subtitle">Enter your email</p>

      <input
        type="email"
        placeholder="Email..."
        className="login-input"
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: emailPattern,
            message: 'Invalid email address',
          },
        })}
      />
      {errors.email && <p className="login-error">{errors.email.message}</p>}

      <input
        type="email"
        placeholder="Verify Your Email..."
        className="login-input"
        {...register('verifyEmail', {
          required: 'Please verify your email',
          validate: value => value === email || 'Emails do not match',
        })}
      />
      {errors.verifyEmail && <p className="login-error">{errors.verifyEmail.message}</p>}

      {apiError && <p className="login-error">{apiError}</p>}

      <button type="submit" className="login-button">Continue</button>
    </form>
  );
}

export default ResetPasswordStart;