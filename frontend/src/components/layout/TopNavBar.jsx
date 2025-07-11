// frontend/src/components/layout/TopNavBar.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { IoPersonCircleOutline, IoSearchOutline, IoNotificationsOutline, IoChatboxOutline } from 'react-icons/io5';
import { getNotifications, getUnreadCounts } from '../../api/followApi';
import { searchUsers } from '../../api/userApi';
import { createProfileUrl } from '../../utils/profileUrlUtils';

import './TopNavBar.css'; 

const TopNavBar = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!isAuthenticated) {
        setHasNotifications(false);
        setHasUnreadMessages(false);
        setUnreadNotificationCount(0);
        setUnreadMessageCount(0);
        return;
      }
      try {
        const res = await getUnreadCounts();
        const { unreadNotificationCount, unreadMessageCount } = res.data;
        setUnreadNotificationCount(unreadNotificationCount || 0);
        setUnreadMessageCount(unreadMessageCount || 0);
        setHasNotifications(unreadNotificationCount > 0);
        setHasUnreadMessages(unreadMessageCount > 0);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
        setHasNotifications(false);
        setHasUnreadMessages(false);
        setUnreadNotificationCount(0);
        setUnreadMessageCount(0);
      }
    };
    fetchUnreadCounts();
    
    // Set up interval to refresh unread counts every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    
    // Listen for custom events to refresh unread counts
    const handleMessagesRead = () => {
      fetchUnreadCounts();
    };
    
    window.addEventListener('messagesRead', handleMessagesRead);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const users = await searchUsers(search.trim());
        setResults(users);
        setShowDropdown(true);
      } catch (e) {
        setResults([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

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
    setUnreadNotificationCount(0);
    navigate('/notifications');
  };

  const handleMessagesClick = () => {
    navigate('/messages');
  };



  const handleSelectUser = (user) => {
    setShowDropdown(false);
    setSearch('');
    navigate(createProfileUrl(user.name, user.role));
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
      <div className="top-nav-item search-bar-container" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        <button className="search-button" aria-label="Search">
          <IoSearchOutline size={20} color="#6b7280" />
        </button>
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #eee',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            zIndex: 1000,
            maxHeight: 300,
            overflowY: 'auto',
          }}>
            {loading && <div style={{ padding: 12, color: '#888' }}>Searching...</div>}
            {!loading && results.length === 0 && <div style={{ padding: 12, color: '#888' }}>No users found.</div>}
            {results.map(user => (
              <div
                key={user.id}
                onMouseDown={() => handleSelectUser(user)}
                style={{ display: 'flex', alignItems: 'center', padding: 10, cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
              >
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#888', fontSize: 18 }}>
                    {user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{user.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification and Messaging Icons (Top Right) */}
      <div className="top-nav-item action-icons-container">
        <button className="action-icon-button relative" aria-label="Notifications" onClick={handleNotificationsClick}>
          <IoNotificationsOutline size={24} color="#6b7280" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>
          )}
        </button>
        <button className="action-icon-button relative" aria-label="Messages" onClick={handleMessagesClick}>
          <IoChatboxOutline size={24} color="#6b7280" />
          {hasUnreadMessages && (
            <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3"></span>
          )}
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;