import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './SignUp.css';
import loginLogo from '../../../assets/login-logo.jpg';
import api from '../../../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import LoadingDots from '../../common/LoadingDots';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const schema = yup.object().shape({
  firstName: yup.string().required('Full name is required'),
  gender: yup.string().required('Gender is required'),
  sport: yup.string().required('Sport is required'),
  position: yup.string().required('Position is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .matches(
      passwordPattern,
      'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
    ),
});

function AthleteSignUpForm() {
  const [selectedSport, setSelectedSport] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleProfilePicChange = (e) => {
    setImageError('');
    setPreview(null);
    setSelectedFile(null);

    const file = e.target.files[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setImageError('Unsupported file type. Please use JPG, PNG, GIF, or WebP.');
      e.target.value = null;
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageError(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Please choose a smaller image.`);
      e.target.value = null;
      return;
    }

    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setApiError('');
    setImageError('');
    setIsLoading(true);

    let profilePictureBase64 = null;
    let profilePictureContentType = null;
    if (selectedFile) {
      if (imageError) {
          console.log("Image validation error present, preventing submission.");
          setIsLoading(false);
          return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      profilePictureBase64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          setApiError('Failed to read profile picture file.');
          reject(error);
        };
      }).catch(() => null);
    }

    if (profilePictureBase64 === null && selectedFile) {
        setApiError('Failed to process profile picture. Please try another image.');
        setIsLoading(false);
        return;
    }

    try {
      const payload = {
        ...data,
        profilePictureBase64: profilePictureBase64,
        profilePictureContentType: profilePictureContentType,
        role: 'athlete'
      };

      const response = await api.post('/signup', payload);

      const { idToken, accessToken, refreshToken, userProfile } = response.data;

      login(userProfile, {
        IdToken: idToken,
        AccessToken: accessToken,
        RefreshToken: refreshToken
      });

      console.log('User auto-logged in. Redirecting to home...');
      navigate('/home');

    } catch (err) {
      console.error('Athlete signup error:', err);
      setApiError(
        err.response?.data?.message ||
        err.message ||
        'Sign up failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-box">
      <button
        type="button"
        className="back-button"
        onClick={() => window.history.back()}
      >
        ← Back
      </button>
      <img src={loginLogo} alt="FindPlayer Logo" className="login-logo" />
      <h1 className="login-title">"IT'S TIME FOR YOU TO BECOME HEARD"</h1>
      <p className="login-subtitle">
        Complete your Sign up and Join the <strong>Movement!</strong>
      </p>
      <p className="login-subtitle">I am an <strong>ATHLETE</strong></p>

      <div className="profile-pic-upload">
        <label htmlFor="profile-pic-input" className="profile-pic-label">
          {preview ? (
            <img src={preview} alt="Profile Preview" className="profile-pic-preview" />
          ) : (
            <span className="profile-pic-placeholder">Upload Picture</span>
          )}
        </label>
        <input
          id="profile-pic-input"
          type="file"
          style={{ display: 'none' }}
          onChange={handleProfilePicChange}
        />
      </div>
      {imageError && <p className="login-error image-upload-error">{imageError}</p>}

      <input
        type="text"
        placeholder="Full Name..."
        className="login-input"
        {...register('firstName')}
      />
      {errors.firstName && <p className="login-error">{errors.firstName.message}</p>}

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
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Right Back">Right Back</option>
            <option value="Left Back">Left Back</option>
            <option value="Center Back">Center Back</option>
            <option value="Defensive Midfielder">Defensive Midfielder</option>
            <option value="Central Midfielder">Central Midfielder</option>
            <option value="Attacking Midfielder">Attacking Midfielder</option>
            <option value="Right Winger">Right Winger</option>
            <option value="Left Winger">Left Winger</option>
            <option value="Striker">Striker</option>
            <option value="Second Striker">Second Striker</option>
            <option value="Attacker">Attacker</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Defender">Defender</option>
          </>
        )}
        {selectedSport === 'Basketball' && (
          <>
            <option value="Point Guard">Point Guard</option>
            <option value="Shooting Guard">Shooting Guard</option>
            <option value="Small Forward">Small Forward</option>
            <option value="Power Forward">Power Forward</option>
            <option value="Center">Center</option>
            <option value="Combo Guard">Combo Guard</option>
            <option value="Swingman">Swingman</option>
            <option value="Stretch Four">Stretch Four</option>
            <option value="Sixth Man">Sixth Man</option>
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

      <button type="submit" className="login-button" disabled={isLoading}> {/* <--- Disable while loading */}
        {isLoading ? <LoadingDots /> : 'Continue'} {/* <--- Use LoadingDots component */}
      </button>

      <p className="login-terms">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </p>
    </form>
  );
}

export default AthleteSignUpForm;