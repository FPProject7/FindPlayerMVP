// frontend/src/pages/EventsPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { useAuthStore } from '../stores/useAuthStore'; // Import your authentication store

import './EventsPage.css';

const EventsPage = () => {
  const { isAuthenticated } = useAuthStore(); // Get the authentication status
  const navigate = useNavigate(); // Initialize navigate hook

  const handleSignInClick = () => {
    navigate('/login'); // Redirect to the login page
  };

  return (
    <div className="events-page-container"> {/* <--- Added class for styling */}
      {/* Sign In Button (conditionally rendered) */}
      {!isAuthenticated && (
        <button
          className="sign-in-button"
          onClick={handleSignInClick}
        >
          Sign In
        </button>
      )}

      {/* Your existing content for the Events Page */}
      <h1 className="text-2xl font-bold">Events Page</h1>
      <p className="p-4">This is the content of the Events page. You can see this regardless of login status.</p>
      {/* Add more specific content related to events here */}
    </div>
  );
};

export default EventsPage;