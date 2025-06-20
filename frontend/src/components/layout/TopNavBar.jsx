// frontend/src/components/layout/TopNavBar.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { IoPersonCircleOutline, IoSearchOutline, IoNotificationsOutline, IoChatboxOutline } from 'react-icons/io5';

import './TopNavBar.css'; 

const TopNavBar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleProfileIconClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  // --- NEW: Handlers for Notifications and Messages ---
  const handleNotificationsClick = () => {
    navigate('/notifications');
  };

  const handleMessagesClick = () => {
    navigate('/messages');
  };
  // --- END NEW ---

  return (
    <header className="top-nav-bar">
      {/* Profile Icon (Top Left) */}
      <div className="top-nav-item profile-icon-container">
        <button 
          className="profile-icon-button" 
          onClick={handleProfileIconClick}
          aria-label={isAuthenticated ? "View Profile" : "Login"}
        >
          {user?.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt="Profile" className="profile-pic-thumbnail" />
          ) : (
            <IoPersonCircleOutline size={30} color="#6b7280" />
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="top-nav-item search-bar-container">
        <input type="text" placeholder="Search..." className="search-input" />
        <button className="search-button" aria-label="Search">
          <IoSearchOutline size={20} color="#6b7280" />
        </button>
      </div>

      {/* Notification and Messaging Icons (Top Right) */}
      <div className="top-nav-item action-icons-container">
        <button className="action-icon-button" aria-label="Notifications" onClick={handleNotificationsClick}> {/* <--- Add onClick */}
          <IoNotificationsOutline size={24} color="#6b7280" />
        </button>
        <button className="action-icon-button" aria-label="Messages" onClick={handleMessagesClick}> {/* <--- Add onClick */}
          <IoChatboxOutline size={24} color="#6b7280" />
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;