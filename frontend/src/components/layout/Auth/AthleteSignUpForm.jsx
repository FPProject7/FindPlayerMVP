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

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const schema = yup.object().shape({
  firstName: yup.string().required('Full name is required'),
  gender: yup.string().required('Gender is required'),
  sport: yup.string().required('Sport is required'),
  position: yup.string().required('Position is required'),
  height: yup.number().required('Height is required').min(48, 'Height must be at least 48 inches').max(96, 'Height must be at most 96 inches'),
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

function AthleteSignUpForm() {
  const [selectedSport, setSelectedSport] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [imageError, setImageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [heightInInches, setHeightInInches] = useState(70); // Default 5'10"
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Helper to format inches to feet/inches string
  const formatHeight = (inches) => {
    const feet = Math.floor(inches / 12);
    const inch = inches % 12;
    return `${feet}'${inch}`;
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { height: formatHeight(70) },
  });

  // Keep form value in sync with slider
  useEffect(() => {
    setValue('height', formatHeight(heightInInches));
  }, [heightInInches, setValue]);

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
    }

    if (profilePictureBase64 === null && selectedFile) {
        setApiError('Failed to process profile picture. Please try another image.');
        setIsLoading(false);
        return;
    }

    try {
      const payload = {
        firstName: data.fullName,
        gender: data.gender,
        height: data.height,
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

      const { idToken, accessToken, refreshToken, userProfile } = response.data;

      login(userProfile, {
        IdToken: idToken,
        AccessToken: accessToken,
        RefreshToken: refreshToken
      });

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

      <label htmlFor="height-slider" style={{ marginTop: '1rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Height: {formatHeight(heightInInches)}"</label>
      <input
        id="height-slider"
        type="range"
        min={48}
        max={96}
        step={1}
        value={heightInInches}
        onChange={e => {
          const newValue = Number(e.target.value);
          setHeightInInches(newValue);
          setValue('height', formatHeight(newValue));
        }}
        className="login-input"
        style={{ width: '100%' }}
      />
      <input type="hidden" {...register('height')} />
      {errors.height && <p className="login-error">{errors.height.message}</p>}

      <select className="login-input" {...register('country')} defaultValue="">
        <option value="" disabled>Country...</option>
        <option value="Afghanistan">&#127462;&#127467; Afghanistan</option>
        <option value="Albania">&#127462;&#127473; Albania</option>
        <option value="Algeria">&#127465;&#127487; Algeria</option>
        <option value="Andorra">&#127462;&#127464; Andorra</option>
        <option value="Angola">&#127462;&#127468; Angola</option>
        <option value="Antigua & Deps">&#127462;&#127471; Antigua & Deps</option>
        <option value="Argentina">&#127462;&#127479; Argentina</option>
        <option value="Armenia">&#127462;&#127474; Armenia</option>
        <option value="Australia">&#127462;&#127482; Australia</option>
        <option value="Austria">&#127462;&#127481; Austria</option>
        <option value="Azerbaijan">&#127462;&#127487; Azerbaijan</option>
        <option value="Bahamas">&#127463;&#127486; Bahamas</option>
        <option value="Bahrain">&#127463;&#127469; Bahrain</option>
        <option value="Bangladesh">&#127463;&#127464; Bangladesh</option>
        <option value="Barbados">&#127463;&#127463; Barbados</option>
        <option value="Belarus">&#127463;&#127486; Belarus</option>
        <option value="Belgium">&#127463;&#127466; Belgium</option>
        <option value="Belize">&#127463;&#127487; Belize</option>
        <option value="Benin">&#127463;&#127471; Benin</option>
        <option value="Bhutan">&#127463;&#127481; Bhutan</option>
        <option value="Bolivia">&#127463;&#127468; Bolivia</option>
        <option value="Bosnia Herzegovina">&#127463;&#127462; Bosnia Herzegovina</option>
        <option value="Botswana">&#127463;&#127484; Botswana</option>
        <option value="Brazil">&#127463;&#127479; Brazil</option>
        <option value="Brunei">&#127463;&#127470; Brunei</option>
        <option value="Bulgaria">&#127463;&#127471; Bulgaria</option>
        <option value="Burkina">&#127463;&#127465; Burkina</option>
        <option value="Burundi">&#127463;&#127473; Burundi</option>
        <option value="Cambodia">&#127472;&#127469; Cambodia</option>
        <option value="Cameroon">&#127464;&#127474; Cameroon</option>
        <option value="Canada">&#127464;&#127462; Canada</option>
        <option value="Cape Verde">&#127464;&#127486; Cape Verde</option>
        <option value="Central African Rep">&#127464;&#127465; Central African Rep</option>
        <option value="Chad">&#127481;&#127464; Chad</option>
        <option value="Chile">&#127464;&#127473; Chile</option>
        <option value="China">&#127464;&#127470; China</option>
        <option value="Colombia">&#127464;&#127468; Colombia</option>
        <option value="Comoros">&#127472;&#127474; Comoros</option>
        <option value="Congo">&#127464;&#127471; Congo</option>
        <option value="Congo {Democratic Rep}">&#127464;&#127464; Congo {'{Democratic Rep}'}</option>
        <option value="Costa Rica">&#127464;&#127479; Costa Rica</option>
        <option value="Croatia">&#127469;&#127479; Croatia</option>
        <option value="Cuba">&#127464;&#127482; Cuba</option>
        <option value="Cyprus">&#127464;&#127486; Cyprus</option>
        <option value="Czech Republic">&#127464;&#127487; Czech Republic</option>
        <option value="Denmark">&#127465;&#127472; Denmark</option>
        <option value="Djibouti">&#127465;&#127471; Djibouti</option>
        <option value="Dominica">&#127465;&#127474; Dominica</option>
        <option value="Dominican Republic">&#127465;&#127468; Dominican Republic</option>
        <option value="East Timor">&#127481;&#127473; East Timor</option>
        <option value="Ecuador">&#127466;&#127464; Ecuador</option>
        <option value="Egypt">&#127466;&#127471; Egypt</option>
        <option value="El Salvador">&#127486;&#127486; El Salvador</option>
        <option value="Equatorial Guinea">&#127471;&#127474; Equatorial Guinea</option>
        <option value="Eritrea">&#127466;&#127479; Eritrea</option>
        <option value="Estonia">&#127466;&#127466; Estonia</option>
        <option value="Ethiopia">&#127466;&#127481; Ethiopia</option>
        <option value="Fiji">&#127467;&#127471; Fiji</option>
        <option value="Finland">&#127467;&#127473; Finland</option>
        <option value="France">&#127467;&#127479; France</option>
        <option value="Gabon">&#127471;&#127462; Gabon</option>
        <option value="Gambia">&#127471;&#127474; Gambia</option>
        <option value="Georgia">&#127471;&#127466; Georgia</option>
        <option value="Germany">&#127465;&#127466; Germany</option>
        <option value="Ghana">&#127471;&#127469; Ghana</option>
        <option value="Greece">&#127471;&#127479; Greece</option>
        <option value="Grenada">&#127471;&#127464; Grenada</option>
        <option value="Guatemala">&#127471;&#127481; Guatemala</option>
        <option value="Guinea">&#127471;&#127470; Guinea</option>
        <option value="Guinea-Bissau">&#127471;&#127484; Guinea-Bissau</option>
        <option value="Guyana">&#127471;&#127486; Guyana</option>
        <option value="Haiti">&#127469;&#127481; Haiti</option>
        <option value="Honduras">&#127469;&#127470; Honduras</option>
        <option value="Hungary">&#127469;&#127482; Hungary</option>
        <option value="Iceland">&#127470;&#127486; Iceland</option>
        <option value="India">&#127470;&#127470; India</option>
        <option value="Indonesia">&#127470;&#127464; Indonesia</option>
        <option value="Iran">&#127470;&#127479; Iran</option>
        <option value="Iraq">&#127470;&#127474; Iraq</option>
        <option value="Ireland {Republic}">&#127470;&#127466; Ireland {'{Republic}'}</option>
        <option value="Israel">&#127470;&#127473; Israel</option>
        <option value="Italy">&#127470;&#127481; Italy</option>
        <option value="Ivory Coast">&#127464;&#127470; Ivory Coast</option>
        <option value="Jamaica">&#127471;&#127474; Jamaica</option>
        <option value="Japan">&#127471;&#127477; Japan</option>
        <option value="Jordan">&#127471;&#127468; Jordan</option>
        <option value="Kazakhstan">&#127472;&#127487; Kazakhstan</option>
        <option value="Kenya">&#127472;&#127466; Kenya</option>
        <option value="Kiribati">&#127472;&#127470; Kiribati</option>
        <option value="Korea North">&#127472;&#127477; Korea North</option>
        <option value="Korea South">&#127472;&#127479; Korea South</option>
        <option value="Kosovo">&#127472;&#127472; Kosovo</option>
        <option value="Kuwait">&#127472;&#127484; Kuwait</option>
        <option value="Kyrgyzstan">&#127472;&#127471; Kyrgyzstan</option>
        <option value="Laos">&#127473;&#127462; Laos</option>
        <option value="Latvia">&#127473;&#127486; Latvia</option>
        <option value="Lebanon">&#127473;&#127463; Lebanon</option>
        <option value="Lesotho">&#127473;&#127486; Lesotho</option>
        <option value="Liberia">&#127473;&#127479; Liberia</option>
        <option value="Libya">&#127473;&#127486; Libya</option>
        <option value="Liechtenstein">&#127473;&#127470; Liechtenstein</option>
        <option value="Lithuania">&#127473;&#127481; Lithuania</option>
        <option value="Luxembourg">&#127473;&#127482; Luxembourg</option>
        <option value="Macedonia">&#127474;&#127472; Macedonia</option>
        <option value="Madagascar">&#127474;&#127471; Madagascar</option>
        <option value="Malawi">&#127474;&#127484; Malawi</option>
        <option value="Malaysia">&#127474;&#127486; Malaysia</option>
        <option value="Maldives">&#127474;&#127486; Maldives</option>
        <option value="Mali">&#127474;&#127473; Mali</option>
        <option value="Malta">&#127474;&#127481; Malta</option>
        <option value="Marshall Islands">&#127474;&#127469; Marshall Islands</option>
        <option value="Mauritania">&#127474;&#127479; Mauritania</option>
        <option value="Mauritius">&#127474;&#127482; Mauritius</option>
        <option value="Mexico">&#127474;&#127466; Mexico</option>
        <option value="Micronesia">&#127467;&#127474; Micronesia</option>
        <option value="Moldova">&#127474;&#127464; Moldova</option>
        <option value="Monaco">&#127474;&#127464; Monaco</option>
        <option value="Mongolia">&#127474;&#127470; Mongolia</option>
        <option value="Montenegro">&#127474;&#127466; Montenegro</option>
        <option value="Morocco">&#127474;&#127462; Morocco</option>
        <option value="Mozambique">&#127474;&#127487; Mozambique</option>
        <option value="Myanmar, {Burma}">&#127474;&#127474; Myanmar, {'{Burma}'}</option>
        <option value="Namibia">&#127470;&#127462; Namibia</option>
        <option value="Nauru">&#127470;&#127479; Nauru</option>
        <option value="Nepal">&#127470;&#127477; Nepal</option>
        <option value="Netherlands">&#127470;&#127473; Netherlands</option>
        <option value="New Zealand">&#127470;&#127487; New Zealand</option>
        <option value="Nicaragua">&#127470;&#127470; Nicaragua</option>
        <option value="Niger">&#127470;&#127466; Niger</option>
        <option value="Nigeria">&#127470;&#127471; Nigeria</option>
        <option value="Norway">&#127470;&#127468; Norway</option>
        <option value="Oman">&#127468;&#127474; Oman</option>
        <option value="Pakistan">&#127477;&#127472; Pakistan</option>
        <option value="Palau">&#127477;&#127484; Palau</option>
        <option value="Panama">&#127477;&#127462; Panama</option>
        <option value="Papua New Guinea">&#127477;&#127471; Papua New Guinea</option>
        <option value="Paraguay">&#127477;&#127486; Paraguay</option>
        <option value="Peru">&#127477;&#127466; Peru</option>
        <option value="Philippines">&#127477;&#127469; Philippines</option>
        <option value="Poland">&#127477;&#127473; Poland</option>
        <option value="Portugal">&#127477;&#127481; Portugal</option>
        <option value="Qatar">&#127474;&#127462; Qatar</option>
        <option value="Romania">&#127479;&#127468; Romania</option>
        <option value="Russian Federation">&#127479;&#127482; Russian Federation</option>
        <option value="Rwanda">&#127479;&#127484; Rwanda</option>
        <option value="St Kitts & Nevis">&#127472;&#127470; St Kitts & Nevis</option>
        <option value="St Lucia">&#127473;&#127464; St Lucia</option>
        <option value="Saint Vincent & the Grenadines">&#127486;&#127464; Saint Vincent & the Grenadines</option>
        <option value="Samoa">&#127484;&#127486; Samoa</option>
        <option value="San Marino">&#127486;&#127474; San Marino</option>
        <option value="Sao Tome & Principe">&#127486;&#127481; Sao Tome & Principe</option>
        <option value="Saudi Arabia">&#127486;&#127462; Saudi Arabia</option>
        <option value="Senegal">&#127486;&#127470; Senegal</option>
        <option value="Serbia">&#127479;&#127486; Serbia</option>
        <option value="Seychelles">&#127486;&#127464; Seychelles</option>
        <option value="Sierra Leone">&#127486;&#127473; Sierra Leone</option>
        <option value="Singapore">&#127486;&#127471; Singapore</option>
        <option value="Slovakia">&#127486;&#127472; Slovakia</option>
        <option value="Slovenia">&#127486;&#127470; Slovenia</option>
        <option value="Solomon Islands">&#127486;&#127463; Solomon Islands</option>
        <option value="Somalia">&#127486;&#127468; Somalia</option>
        <option value="South Africa">&#127487;&#127462; South Africa</option>
        <option value="South Sudan">&#127486;&#127486; South Sudan</option>
        <option value="Spain">&#127466;&#127486; Spain</option>
        <option value="Sri Lanka">&#127473;&#127472; Sri Lanka</option>
        <option value="Sudan">&#127486;&#127464; Sudan</option>
        <option value="Suriname">&#127486;&#127479; Suriname</option>
        <option value="Swaziland">&#127486;&#127487; Swaziland</option>
        <option value="Sweden">&#127486;&#127466; Sweden</option>
        <option value="Switzerland">&#127464;&#127469; Switzerland</option>
        <option value="Syria">&#127486;&#127486; Syria</option>
        <option value="Taiwan">&#127481;&#127484; Taiwan</option>
        <option value="Tajikistan">&#127481;&#127471; Tajikistan</option>
        <option value="Tanzania">&#127481;&#127487; Tanzania</option>
        <option value="Thailand">&#127481;&#127469; Thailand</option>
        <option value="Togo">&#127481;&#127471; Togo</option>
        <option value="Tonga">&#127481;&#127468; Tonga</option>
        <option value="Trinidad & Tobago">&#127481;&#127481; Trinidad & Tobago</option>
        <option value="Tunisia">&#127481;&#127470; Tunisia</option>
        <option value="Turkey">&#127481;&#127479; Turkey</option>
        <option value="Turkmenistan">&#127481;&#127474; Turkmenistan</option>
        <option value="Tuvalu">&#127481;&#127486; Tuvalu</option>
        <option value="Uganda">&#127482;&#127471; Uganda</option>
        <option value="Ukraine">&#127482;&#127462; Ukraine</option>
        <option value="United Arab Emirates">&#127462;&#127466; United Arab Emirates</option>
        <option value="United Kingdom">&#127471;&#127463; United Kingdom</option>
        <option value="United States">&#127482;&#127486; United States</option>
        <option value="Uruguay">&#127482;&#127486; Uruguay</option>
        <option value="Uzbekistan">&#127482;&#127487; Uzbekistan</option>
        <option value="Vanuatu">&#127486;&#127482; Vanuatu</option>
        <option value="Vatican City">&#127486;&#127462; Vatican City</option>
        <option value="Venezuela">&#127486;&#127466; Venezuela</option>
        <option value="Vietnam">&#127486;&#127470; Vietnam</option>
        <option value="Yemen">&#127486;&#127466; Yemen</option>
        <option value="Zambia">&#127487;&#127474; Zambia</option>
        <option value="Zimbabwe">&#127487;&#127484; Zimbabwe</option>
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