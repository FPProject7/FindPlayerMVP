import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import api from '../../../api/axiosConfig';
import LoadingDots from '../../common/LoadingDots';
import './SocialLoginButtons.css';

function SocialLoginButtons() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Step 1: Get Google OAuth URL from our backend
      const response = await api.post('/google-signin');
      const { authUrl } = response.data;
      
      // Step 2: Open Google OAuth popup
      const popup = window.open(
        authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Step 3: Listen for the OAuth callback
      const handleMessage = async (event) => {
        // Only accept messages from our own domain
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          const { code, state } = event.data;
          
          try {
            // Step 4: Exchange code for tokens via our backend
            const callbackResponse = await api.post('/google-callback', { code, state });
            const { idToken, accessToken, refreshToken, userProfile, needsProfileCompletion } = callbackResponse.data;
            
            // Close the popup
            if (popup) popup.close();
            
            // Login the user
            login(userProfile, {
              IdToken: idToken,
              AccessToken: accessToken,
              RefreshToken: refreshToken
            });
            
            // Navigate based on whether profile completion is needed
            if (needsProfileCompletion) {
              navigate('/complete-profile', { 
                state: { 
                  email: userProfile.email,
                  name: userProfile.name,
                  profilePictureUrl: userProfile.profilePictureUrl
                }
              });
            } else {
              navigate('/home');
            }
            
            // Clean up event listener
            window.removeEventListener('message', handleMessage);
            
          } catch (callbackError) {
            console.error('Google callback error:', callbackError);
            setError('Google authentication failed. Please try again.');
            if (popup) popup.close();
            window.removeEventListener('message', handleMessage);
          }
                 } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
           const errorMessage = event.data.error === 'EMAIL_EXISTS_WITH_PASSWORD' 
             ? 'An account with this email already exists using email/password. Please sign in with your password or use a different Google account.'
             : 'Google authentication was cancelled or failed.';
           setError(errorMessage);
           if (popup) popup.close();
           window.removeEventListener('message', handleMessage);
         }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Handle popup closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsLoading(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Google signin error:', error);
      setError('Failed to start Google authentication. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="social-buttons">
      <button 
        type="button" 
        className="social-button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingDots />
        ) : (
          <>
            <FcGoogle className="social-icon" />
            Continue with Google
          </>
        )}
      </button>
      {error && <p className="social-error">{error}</p>}
    </div>
  );
}

export default SocialLoginButtons;
