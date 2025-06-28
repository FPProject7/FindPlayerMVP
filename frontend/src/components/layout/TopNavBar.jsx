// frontend/src/components/layout/TopNavBar.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { IoPersonCircleOutline, IoSearchOutline, IoNotificationsOutline, IoChatboxOutline } from 'react-icons/io5';
import { getNotifications } from '../../api/followApi';

import './TopNavBar.css'; 

const TopNavBar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated) {
        setHasNotifications(false);
        return;
      }
      try {
        const res = await getNotifications();
        setHasNotifications(Array.isArray(res.data) && res.data.length > 0);
      } catch {
        setHasNotifications(false);
      }
    };
    fetchNotifications();
  }, [isAuthenticated]);

  const handleProfileIconClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  // --- NEW: Handlers for Notifications and Messages ---
  const handleNotificationsClick = () => {
    setHasNotifications(false);
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
        <button className="action-icon-button relative" aria-label="Notifications" onClick={handleNotificationsClick}>
          <IoNotificationsOutline size={24} color="#6b7280" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>
          )}
        </button>
        <button className="action-icon-button" aria-label="Messages" onClick={handleMessagesClick}>
          <IoChatboxOutline size={24} color="#6b7280" />
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;