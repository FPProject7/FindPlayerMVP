import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';

const schema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  gender: yup.string().required('Gender is required'),
  sport: yup.string().required('Sport is required'),
  position: yup.string().required('Position is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

function AthleteSignUpForm() {
  const [selectedSport, setSelectedSport] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    console.log('Athlete signup:', data);
    alert('Signed up as athlete (just testing)!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
        <button 
  type="button" 
  className="back-button"
  onClick={() => window.location.reload()}  // or better: a function that resets the role
>
  ← Back
</button>
       <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">"IT'S TIME FOR YOU TO BECOME HEARD"</h1>
      <p className="login-subtitle">
        Complete your Sign up and Join the <strong>Movement!</strong>
      </p>
      <p className="login-subtitle">I am an <strong>ATHLETE</strong></p>

      <div className="profile-pic-placeholder"></div>

      <input
        type="text"
        placeholder="Full Name..."
        className="login-input"
        {...register('fullName')}
      />
      {errors.fullName && <p className="login-error">{errors.fullName.message}</p>}

      <select
        className="login-input"
        {...register('gender')}
        defaultValue=""
      >
        <option value="" disabled>Gender...</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
        <option value="Prefer Not to Say">Prefer Not to Say</option>
      </select>
      {errors.gender && <p className="login-error">{errors.gender.message}</p>}

      <select
        className="login-input"
        {...register('sport')}
        value={selectedSport}
        onChange={(e) => setSelectedSport(e.target.value)}
      >
        <option value="" disabled>Select Sport...</option>
        <option value="Football">Football</option>
        <option value="Basketball">Basketball</option>
      </select>
      {errors.sport && <p className="login-error">{errors.sport.message}</p>}

      <select
        className="login-input"
        {...register('position')}
        defaultValue=""
      >
        <option value="" disabled>Position...</option>
        {selectedSport === 'Football' && (
          <>
            <option value="Attacker">Attacker</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Defender">Defender</option>
          </>
        )}
        {selectedSport === 'Basketball' && (
          <>
            <option value="Point Guard">Point Guard</option>
            <option value="Shooting Guard">Shooting Guard</option>
            <option value="Center">Center</option>
          </>
        )}
      </select>
      {errors.position && <p className="login-error">{errors.position.message}</p>}

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

export default AthleteSignUpForm;
