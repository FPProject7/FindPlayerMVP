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
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (!isAuthenticated) {
        setNotifCount(0);
        return;
      }
      try {
        const res = await getNotifications();
        setNotifCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch {
        setNotifCount(0);
      }
    };
    fetchCount();
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
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center" style={{fontSize: '0.75rem'}}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
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