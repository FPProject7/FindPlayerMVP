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
import { countries } from '../../../utils/countryList';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// Constants for image validation (same as other forms)
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const schema = yup.object().shape({
  fullName: yup.string().required('Full name is required'),
  gender: yup.string().required('Gender is required'),
  expertise: yup.string().required('Sport of expertise is required'),
  country: yup.string().required('Country is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .matches(
      passwordPattern,
      'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
    ),
});

function ScoutSignUpForm() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // <--- New loading state
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
          setApiError('Failed to read profile picture file.');
          reject(error);
        };
      }).catch(() => null);

      if (profilePictureBase64) {
          profilePictureContentType = selectedFile.type;
      }
    }

    if (profilePictureBase64 === null && selectedFile) {
        setApiError('Failed to process profile picture. Please try another image.');
        setIsLoading(false); // <--- Reset loading if file processing fails
        return;
    }

    try {
      const payload = {
        name: data.fullName,
        gender: data.gender,
        sport: data.expertise,
        country: data.country,
        email: data.email,
        password: data.password,
        profilePictureBase64: profilePictureBase64,
        profilePictureContentType: profilePictureContentType,
        role: 'scout'
      };

      const response = await api.post('/signup', payload);

      // Check if email verification is required
      if (response.data.requiresVerification) {
        navigate('/verify-email', { 
          state: { email: data.email } 
        });
      } else {
        const { idToken, accessToken, refreshToken, userProfile } = response.data;
        login(userProfile, {
          IdToken: idToken,
          AccessToken: accessToken,
          RefreshToken: refreshToken
        });
        navigate('/home');
      }

    } catch (err) {
      let backendMsg = err.response?.data?.message || '';
      if (
        backendMsg.toLowerCase().includes('already exists') ||
        backendMsg.toLowerCase().includes('already verified')
      ) {
        setApiError('An account with this email already exists and is verified. Please log in or reset your password.');
      } else {
        setApiError(
          backendMsg ||
          err.message ||
          'Sign up failed. Please try again.'
        );
      }
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

      <h1 className="login-title">IT'S TIME FOR YOU TO DISCOVER THE FUTURE STARS</h1>
      <p className="login-subtitle">
        Complete your Sign-up and Start Finding <strong>Talent!</strong>
      </p>

      <div className="profile-pic-upload">
        <label htmlFor="scout-profile-pic-input" className="profile-pic-label">
          {preview ? (
            <img src={preview} alt="Profile Preview" className="profile-pic-preview" />
          ) : (
            <span className="profile-pic-placeholder">Upload Picture</span>
          )}
        </label>
        <input
          id="scout-profile-pic-input"
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
        {...register('fullName')}
      />
      {errors.fullName && <p className="login-error">{errors.fullName.message}</p>}

      <select className="login-input" {...register('gender')} defaultValue="">
        <option value="" disabled>Gender...</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      {errors.gender && <p className="login-error">{errors.gender.message}</p>}

      <select className="login-input" {...register('expertise')} defaultValue="">
        <option value="" disabled>Sport of Expertise...</option>
        <option value="Football">Football</option>
        <option value="Basketball">Basketball</option>
      </select>
      {errors.expertise && <p className="login-error">{errors.expertise.message}</p>}

      <select className="login-input" {...register('country')} defaultValue="">
        <option value="" disabled>Country...</option>
        {countries.map(country => (
          <option key={country.name} value={country.name}>
            {country.flag} {country.name}
          </option>
        ))}
      </select>
      {errors.country && <p className="login-error">{errors.country.message}</p>}

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

      {apiError && <p className="login-error api-error">{apiError}</p>}

      <button type="submit" className="login-button" disabled={isLoading}>
        {isLoading ? <LoadingDots /> : 'Sign Up'}
      </button>

      <p className="login-footer-text">
        Already have an account? <a href="/login" className="login-footer-link">Log in</a>
      </p>
    </form>
  );
}

export default ScoutSignUpForm;