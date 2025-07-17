import React, { useState, useEffect } from 'react';
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

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// Conversion functions
const inchesToCm = (inches) => Math.round(inches * 2.54);
const cmToInches = (cm) => Math.round(cm / 2.54);
const lbsToKg = (lbs) => Math.round(lbs * 0.453592);
const kgToLbs = (kg) => Math.round(kg / 0.453592);

// Format height for display
const formatHeightImperial = (inches) => {
  const feet = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${feet}'${inch}"`;
};

const formatHeightMetric = (cm) => {
  const meters = Math.floor(cm / 100);
  const remainingCm = cm % 100;
  return `${meters}m ${remainingCm}cm`;
};

function AthleteSignUpForm() {
  const [selectedSport, setSelectedSport] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useMetric, setUseMetric] = useState(false);
  const [heightInInches, setHeightInInches] = useState(70); // Default 5'10"
  const [weightInLbs, setWeightInLbs] = useState(150); // Default 150 lbs
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Single schema - we'll handle unit-specific validation manually
  const schema = yup.object().shape({
    firstName: yup.string().required('Full name is required'),
    gender: yup.string().required('Gender is required'),
    sport: yup.string().required('Sport is required'),
    position: yup.string().required('Position is required'),
    height: yup.number().typeError('Height is required').required('Height is required'),
    weight: yup.number().typeError('Weight must be a number').required('Weight is required'),
    date_of_birth: yup.date().typeError('Date of birth is required').required('Date of birth is required').max(new Date(), 'Date of birth cannot be in the future'),
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { height: 70, weight: 150 },
  });

  // Keep form values in sync with state
  useEffect(() => {
    setValue('height', heightInInches);
    setValue('weight', weightInLbs);
  }, [heightInInches, weightInLbs, setValue]);

  // Handle unit toggle
  const handleUnitToggle = () => {
    setUseMetric(!useMetric);
  };

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

  const onSubmit = async (data) => {
    setApiError('');
    setImageError('');
    setIsLoading(true);

    // Manual validation for height and weight based on unit system
    let heightError = null;
    let weightError = null;

    if (useMetric) {
      const heightInCm = inchesToCm(data.height);
      if (heightInCm < 122) heightError = 'Height must be at least 122 cm';
      if (heightInCm > 244) heightError = 'Height must be at most 244 cm';
      
      const weightInKg = lbsToKg(data.weight);
      if (weightInKg < 23) weightError = 'Weight must be at least 23 kg';
      if (weightInKg > 181) weightError = 'Weight must be at most 181 kg';
    } else {
      if (data.height < 48) heightError = 'Height must be at least 48 inches';
      if (data.height > 96) heightError = 'Height must be at most 96 inches';
      
      if (data.weight < 50) weightError = 'Weight must be at least 50 lbs';
      if (data.weight > 400) weightError = 'Weight must be at most 400 lbs';
    }

    if (heightError || weightError) {
      setApiError(`${heightError || ''} ${weightError || ''}`.trim());
      setIsLoading(false);
      return;
    }

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
    }

    if (profilePictureBase64 === null && selectedFile) {
        setApiError('Failed to process profile picture. Please try another image.');
        setIsLoading(false);
        return;
    }

    try {
      const payload = {
        name: data.firstName,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        date_of_birth: data.date_of_birth,
        sport: data.sport,
        position: data.position,
        country: data.country,
        email: data.email,
        password: data.password,
        profilePictureBase64: profilePictureBase64,
        profilePictureContentType: profilePictureContentType,
        role: 'athlete'
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
      <h1 className="login-title">"IT'S TIME FOR YOU TO BECOME HEARD"</h1>
      <p className="login-subtitle">
        Complete your Sign up and Join the <strong>Movement!</strong>
      </p>

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

      <div className="form-group">
        <label htmlFor="height-slider" className="height-label" style={{ marginTop: '1rem', fontWeight: 'bold', display: 'block' }}>
          Height: {useMetric ? formatHeightMetric(inchesToCm(heightInInches)) : formatHeightImperial(heightInInches)}
        </label>
        <div className="unit-toggle-container">
          <span>Imperial</span>
          <label className="switch">
            <input type="checkbox" checked={useMetric} onChange={handleUnitToggle} />
            <span className="slider round"></span>
          </label>
          <span>Metric</span>
        </div>
        <div className="height-slider-wrapper">
      <input
        id="height-slider"
        type="range"
            min={useMetric ? 122 : 48}
            max={useMetric ? 244 : 96}
        step={1}
            value={useMetric ? inchesToCm(heightInInches) : heightInInches}
        onChange={e => {
          const newValue = Number(e.target.value);
              const newHeightInInches = useMetric ? cmToInches(newValue) : newValue;
              setHeightInInches(newHeightInInches);
              setValue('height', newHeightInInches);
        }}
        className="login-input"
      />
        </div>
      <input type="hidden" {...register('height')} />
      {errors.height && <p className="login-error">{errors.height.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="weight">Weight ({useMetric ? 'kg' : 'lbs'})</label>
        <input
          id="weight"
          type="number"
          step="1"
          min={useMetric ? 23 : 50}
          max={useMetric ? 181 : 400}
          value={useMetric ? lbsToKg(weightInLbs) : weightInLbs}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            const newWeightInLbs = useMetric ? kgToLbs(newValue) : newValue;
            setWeightInLbs(newWeightInLbs);
            setValue('weight', newWeightInLbs);
          }}
          className={`login-input${errors.weight ? ' input-error' : ''}`}
        />
        {errors.weight && <p className="login-error">{errors.weight.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="date_of_birth">Date of Birth</label>
        <input
          id="date_of_birth"
          type="date"
          {...register('date_of_birth')}
          className={`login-input${errors.date_of_birth ? ' input-error' : ''}`}
        />
        {errors.date_of_birth && <p className="login-error">{errors.date_of_birth.message}</p>}
      </div>

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