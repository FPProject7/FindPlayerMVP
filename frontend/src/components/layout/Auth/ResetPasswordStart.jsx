import React from 'react';
import { useForm } from 'react-hook-form';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';

function ResetPasswordStart({ onContinue }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log('Email submitted:', data);
    onContinue();  // move to next step
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
        {...register('email', { required: 'Email is required' })}
      />
      {errors.email && <p className="login-error">{errors.email.message}</p>}

      <input
        type="email"
        placeholder="Verify Your Email..."
        className="login-input"
        {...register('verifyEmail', { required: 'Please verify your email' })}
      />
      {errors.verifyEmail && <p className="login-error">{errors.verifyEmail.message}</p>}

      <button type="submit" className="login-button">Continue</button>
    </form>
  );
}

export default ResetPasswordStart;
