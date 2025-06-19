import React from 'react';
import { useForm } from 'react-hook-form';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';

function ResetPasswordSetNew() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log('Password reset:', data);
    alert('Password has been reset!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
       <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">FindPlayer</h1>
      <p className="login-subtitle">Reset Your Password</p>

      <input
        type="password"
        placeholder="Reset Your Password..."
        className="login-input"
        {...register('password', { required: 'Password is required' })}
      />
      {errors.password && <p className="login-error">{errors.password.message}</p>}

      <input
        type="password"
        placeholder="Verify Your Password..."
        className="login-input"
        {...register('verifyPassword', { required: 'Please verify your password' })}
      />
      {errors.verifyPassword && <p className="login-error">{errors.verifyPassword.message}</p>}

      <button type="submit" className="login-button">Continue</button>
    </form>
  );
}

export default ResetPasswordSetNew;
