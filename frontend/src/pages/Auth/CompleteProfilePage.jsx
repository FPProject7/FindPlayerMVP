import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../api/axiosConfig';
import { useAuthStore } from '../../stores/useAuthStore';
import LoadingDots from '../../components/common/LoadingDots';
import './CompleteProfilePage.css';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const schema = yup.object().shape({
  role: yup.string().required('Role is required'),
  gender: yup.string().required('Gender is required'),
  sport: yup.string().required('Sport is required'),
  country: yup.string().required('Country is required'),
  // Conditional validation for athletes
  position: yup.string().when('role', {
    is: 'athlete',
    then: yup.string().required('Position is required'),
    otherwise: yup.string().optional(),
  }),
  height: yup.number().when('role', {
    is: 'athlete',
    then: yup.number().typeError('Height is required').required('Height is required').min(48, 'Height must be at least 48 inches').max(96, 'Height must be at most 96 inches'),
    otherwise: yup.number().optional(),
  }),
  weight: yup.number().when('role', {
    is: 'athlete',
    then: yup.number().typeError('Weight must be a number').required('Weight is required').min(50, 'Weight must be at least 50 lbs').max(400, 'Weight must be at most 400 lbs'),
    otherwise: yup.number().optional(),
  }),
  date_of_birth: yup.date().when('role', {
    is: 'athlete',
    then: yup.date().typeError('Date of birth is required').required('Date of birth is required').max(new Date(), 'Date of birth cannot be in the future'),
    otherwise: yup.date().optional(),
  }),
});

function CompleteProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [apiError, setApiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [heightInInches, setHeightInInches] = useState(70); // Default 5'10"

  // Get user data from location state (passed from Google auth)
  const { email, name, profilePictureUrl } = location.state || {};

  useEffect(() => {
    // If no user data, redirect to login
    if (!email) {
      navigate('/login');
      return;
    }

    // Set initial preview if user has a profile picture from Google
    if (profilePictureUrl) {
      setPreview(profilePictureUrl);
    }
  }, [email, profilePictureUrl, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { height: 70 },
  });

  const watchedRole = watch('role');

  // Keep form value in sync with slider
  useEffect(() => {
    setValue('height', heightInInches);
  }, [heightInInches, setValue]);

  // Update selected role when form value changes
  useEffect(() => {
    setSelectedRole(watchedRole);
  }, [watchedRole]);

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
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        email: email,
        role: data.role,
        gender: data.gender,
        sport: data.sport,
        position: data.position,
        height: data.height,
        weight: data.weight,
        date_of_birth: data.date_of_birth,
        country: data.country,
        profilePictureBase64: profilePictureBase64,
        profilePictureContentType: profilePictureContentType,
      };

      const response = await api.post('/complete-profile', payload);
      const { userProfile } = response.data;

      // Update the user profile in the auth store
      login(userProfile, {
        IdToken: user.IdToken,
        AccessToken: user.AccessToken,
        RefreshToken: user.RefreshToken
      });

      navigate('/home');

    } catch (err) {
      console.error('Profile completion error:', err);
      setApiError(
        err.response?.data?.message ||
        err.message ||
        'Profile completion failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return null; // Will redirect to login
  }

  return (
    <div className="complete-profile-container">
      <div className="complete-profile-card">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/login')}
        >
          ← Back to Login
        </button>
        
        <h1 className="complete-profile-title">Complete Your Profile</h1>
        <p className="complete-profile-subtitle">
          Welcome, {name}! Please provide some additional information to complete your profile.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="complete-profile-form">
          <div className="profile-pic-section">
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
            {imageError && <p className="error-message">{imageError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="role">I am a:</label>
            <select
              id="role"
              {...register('role')}
              className="form-input"
            >
              <option value="">Select your role</option>
              <option value="athlete">Athlete</option>
              <option value="coach">Coach</option>
              <option value="scout">Scout</option>
            </select>
            {errors.role && <p className="error-message">{errors.role.message}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender:</label>
            <select
              id="gender"
              {...register('gender')}
              className="form-input"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && <p className="error-message">{errors.gender.message}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="sport">Sport:</label>
            <select
              id="sport"
              {...register('sport')}
              className="form-input"
            >
              <option value="">Select sport</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="baseball">Baseball</option>
              <option value="tennis">Tennis</option>
              <option value="golf">Golf</option>
              <option value="hockey">Hockey</option>
              <option value="volleyball">Volleyball</option>
              <option value="track">Track & Field</option>
              <option value="swimming">Swimming</option>
              <option value="other">Other</option>
            </select>
            {errors.sport && <p className="error-message">{errors.sport.message}</p>}
          </div>

          {selectedRole === 'athlete' && (
            <>
              <div className="form-group">
                <label htmlFor="position">Position:</label>
                <select
                  id="position"
                  {...register('position')}
                  className="form-input"
                >
                  <option value="">Select position</option>
                  <option value="quarterback">Quarterback</option>
                  <option value="running_back">Running Back</option>
                  <option value="wide_receiver">Wide Receiver</option>
                  <option value="tight_end">Tight End</option>
                  <option value="offensive_line">Offensive Line</option>
                  <option value="defensive_line">Defensive Line</option>
                  <option value="linebacker">Linebacker</option>
                  <option value="cornerback">Cornerback</option>
                  <option value="safety">Safety</option>
                  <option value="kicker">Kicker</option>
                  <option value="punter">Punter</option>
                  <option value="other">Other</option>
                </select>
                {errors.position && <p className="error-message">{errors.position.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="height">Height: {Math.floor(heightInInches / 12)}'{heightInInches % 12}"</label>
                <input
                  type="range"
                  min="48"
                  max="96"
                  value={heightInInches}
                  onChange={(e) => setHeightInInches(parseInt(e.target.value))}
                  className="height-slider"
                />
                {errors.height && <p className="error-message">{errors.height.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="weight">Weight (lbs):</label>
                <input
                  type="number"
                  id="weight"
                  {...register('weight')}
                  className="form-input"
                  placeholder="Enter weight"
                />
                {errors.weight && <p className="error-message">{errors.weight.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="date_of_birth">Date of Birth:</label>
                <input
                  type="date"
                  id="date_of_birth"
                  {...register('date_of_birth')}
                  className="form-input"
                />
                {errors.date_of_birth && <p className="error-message">{errors.date_of_birth.message}</p>}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="country">Country:</label>
            <select
              id="country"
              {...register('country')}
              className="form-input"
            >
              <option value="">Select country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="BR">Brazil</option>
              <option value="MX">Mexico</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="CN">China</option>
              <option value="IN">India</option>
              <option value="other">Other</option>
            </select>
            {errors.country && <p className="error-message">{errors.country.message}</p>}
          </div>

          {apiError && <p className="error-message">{apiError}</p>}

          <button type="submit" className="complete-profile-button" disabled={isLoading}>
            {isLoading ? <LoadingDots /> : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfilePage; 