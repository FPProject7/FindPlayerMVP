import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import SocialLoginButtons from './SocialLoginButtons';
import './LoginForm.css';
import loginLogo from '../../../assets/login-logo.jpg';
import { Link } from 'react-router-dom';

// Validation schema
const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

function LoginForm({ setIsAuthenticated }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log('Form data:', data);
    alert('Logged in (just testing)!');
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

<div className="input-group">
  <input
    type="password"
    placeholder="Password..."
    className="login-input"
    {...register('password')}
  />
  {errors.password && <p className="login-error">{errors.password.message}</p>}
</div>

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
