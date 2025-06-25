// frontend/src/pages/ChallengesPage.jsx

import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore'; // <--- Import useAuthStore
import { useNavigate } from 'react-router-dom';     // <--- Import useNavigate

// Import the new role-specific challenge views (You will create these files next)
import AthleteChallengesView from './challenges/AthleteChallengesView'; // <--- New component
import CoachChallengesView from './challenges/CoachChallengesView';   // <--- New component

const ChallengesPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Effect to handle redirection for unauthenticated or unhandled roles
  useEffect(() => {
    // If user is not authenticated, redirect to home (where modal appears to prompt login)
    // This is consistent with the App.jsx modal logic.
    if (!isAuthenticated) {
      navigate('/home');
      return;
    }

    // If authenticated, but role is null or not explicitly handled for this page, redirect.
    // This ensures only known roles access specific challenge views.
    const userRoleLower = user?.role?.toLowerCase();
    if (!userRoleLower || (userRoleLower !== 'athlete' && userRoleLower !== 'coach')) {
        // Redirect scouts or other roles away from this specific challenges page content
        // This is based on the ticket focusing on Athlete/Coach for this page's content
        navigate('/home'); // Redirect to a generic authenticated page
    }

  }, [isAuthenticated, user, navigate]); // Depend on isAuthenticated and user changes

  // Display loading/redirecting message while useEffect potentially redirects
  if (!isAuthenticated || !user || (!['athlete', 'coach'].includes(user.role?.toLowerCase()))) {
      return (
        <div className="p-4 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 120px)' }}> {/* Adjust minHeight based on fixed header/footer */}
            <h1 className="text-xl font-bold text-gray-700">Loading or Redirecting...</h1>
        </div>
      );
  }


  // Conditionally render based on user role (now that we've confirmed role is valid and authenticated)
  switch (user.role.toLowerCase()) {
    case 'athlete':
      return <AthleteChallengesView />;
    case 'coach':
      return <CoachChallengesView />;
    default:
      // This case should ideally not be reached due to the useEffect redirect above,
      // but serves as a final fallback.
      navigate('/home');
      return null; // Or a fallback component
  }
};

export default ChallengesPage;