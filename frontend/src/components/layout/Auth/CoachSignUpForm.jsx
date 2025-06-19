import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';

const schema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  gender: yup.string().required('Gender is required'),
  expertise: yup.string().required('Sport of expertise is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

function CoachSignUpForm({ onBack }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log('Coach signup:', data);
    alert('Signed up as coach (just testing)!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
      <button type="button" className="back-button" onClick={onBack}>
        ← Back
      </button>

      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      
      <h1 className="login-title">IT'S TIME FOR YOU TO SHAPE THE NEXT CHAMPIONS</h1>
      <p className="login-subtitle">
        Complete your Sign-up and Start Creating <strong>Challenges!</strong>
      </p>
      <p className="login-subtitle">I am a <strong>COACH</strong></p>

      <div className="profile-pic-placeholder"></div>

      <input
        type="text"
        placeholder="Full Name..."
        className="login-input"
        {...register('fullName')}
      />
      {errors.fullName && <p className="login-error">{errors.fullName.message}</p>}

      <select className="login-input" {...register('gender')} defaultValue="">
        <option value="" disabled>Gender...</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
        <option value="Prefer Not to Say">Prefer Not to Say</option>
      </select>
      {errors.gender && <p className="login-error">{errors.gender.message}</p>}

      <select className="login-input" {...register('expertise')} defaultValue="">
        <option value="" disabled>Sport of Expertise...</option>
        <option value="Football">Football</option>
        <option value="Basketball">Basketball</option>
      </select>
      {errors.expertise && <p className="login-error">{errors.expertise.message}</p>}

      <input
        type="email"
        placeholder="Email..."
        className="login-input"
        {...register('email')}
      />
      {errors.email && <p className="login-error">{errors.email.message}</p>}

      <input
        type="password"
        placeholder="Password..."
        className="login-input"
        {...register('password')}
      />
      {errors.password && <p className="login-error">{errors.password.message}</p>}

      <button type="submit" className="login-button">Continue</button>

      <p className="login-terms">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>
    </form>
  );
}

export default CoachSignUpForm;
