import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './GoogleCallbackPage.css';

function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Handle OAuth error
      window.opener?.postMessage({
        type: 'GOOGLE_OAUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (code && state) {
      // Success - send the authorization code back to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_OAUTH_SUCCESS',
        code: code,
        state: state
      }, window.location.origin);
      window.close();
    } else {
      // No code or state - user probably cancelled
      window.opener?.postMessage({
        type: 'GOOGLE_OAUTH_ERROR',
        error: 'Authentication was cancelled'
      }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="google-callback-container">
      <div className="google-callback-content">
        <div className="loading-spinner"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}

export default GoogleCallbackPage; 