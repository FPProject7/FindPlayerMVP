import React from 'react';
import { useForm } from 'react-hook-form';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';

function ResetPasswordSetNew() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const onSubmit = (data) => {
    // handle password reset
    console.log('Password reset:', data);
    alert('Password has been reset!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">FindPlayer</h1>
      <p className="login-subtitle">Reset Your Password</p>

      <input
        type="text"
        placeholder="Verification Code"
        className="login-input"
        {...register('code', { required: 'Verification code is required' })}
      />
      {errors.code && <p className="login-error">{errors.code.message}</p>}

      <input
        type="password"
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
      {errors.password && <p className="login-error">{errors.password.message}</p>}

      <input
        type="password"
        placeholder="Verify Your Password..."
        className="login-input"
        {...register('verifyPassword', {
          required: 'Please verify your password',
          validate: value => value === password || 'Passwords do not match',
        })}
      />
      {errors.verifyPassword && <p className="login-error">{errors.verifyPassword.message}</p>}

      <button type="submit" className="login-button">Continue</button>
    </form>
  );
}

export default ResetPasswordSetNew;