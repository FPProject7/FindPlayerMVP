// frontend/src/pages/NotificationsPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FollowButton from '../components/common/FollowButton';
import { followUser, unfollowUser, getNotifications, checkFollowing, markNotificationsRead } from '../api/followApi';
import { useAuthStore } from '../stores/useAuthStore';
import ChallengeLoader from '../components/common/ChallengeLoader';
import { createProfileUrl } from '../utils/profileUrlUtils';
import './NotificationsPageSE.css';

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

const NotificationsPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const currentUserId = user?.id;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loadingMap, setLoadingMap] = useState({}); // { notifId: boolean }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const [followStatusMap, setFollowStatusMap] = useState({}); // { fromUserId: boolean }
  const [followStatusLoaded, setFollowStatusLoaded] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('You must be logged in to view notifications.');
      } else {
        setError('Failed to load notifications.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications and follow status together
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      setFollowStatusLoaded(false);
      try {
        const res = await getNotifications();
        setNotifications(res.data);
        
        // Mark all notifications as read when page is opened
        if (res.data.length > 0) {
          try {
            await markNotificationsRead();
          } catch (markError) {
            console.error('Failed to mark notifications as read:', markError);
          }
        }
        
        // Get all unique fromUserIds
        const uniqueFromUserIds = Array.from(new Set(res.data.map(n => n.fromUser.id)));
        const statusMap = {};
        await Promise.all(uniqueFromUserIds.map(async (fromUserId) => {
          if (!currentUserId || fromUserId === currentUserId) {
            statusMap[fromUserId] = false;
            return;
          }
          try {
            const res = await checkFollowing(currentUserId, fromUserId);
            statusMap[fromUserId] = res.data.isFollowing;
          } catch {
            statusMap[fromUserId] = false;
          }
        }));
        setFollowStatusMap(statusMap);
        setFollowStatusLoaded(true);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          setError('You must be logged in to view notifications.');
        } else {
          setError('Failed to load notifications.');
        }
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated && currentUserId) {
      fetchAll();
    } else {
      setLoading(false);
      setError('You must be logged in to view notifications.');
    }
    // eslint-disable-next-line
  }, [isAuthenticated, currentUserId]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    if (loading) return;
    const touch = e.touches[0];
    setPullStartY(touch.clientY);
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (loading) return;
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const distance = Math.max(0, currentY - pullStartY);
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (loading) return;
    if (pullDistance >= PULL_THRESHOLD) {
      fetchNotifications();
    }
    setPullDistance(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [loading, pullStartY, pullDistance]);

  const handleFollowBack = async (notifId, fromUserId) => {
    setLoadingMap((prev) => ({ ...prev, [notifId]: true }));
    setFollowStatusMap((prev) => ({ ...prev, [fromUserId]: true }));
    try {
      await followUser(currentUserId, fromUserId);
    } catch (err) {
      setFollowStatusMap((prev) => ({ ...prev, [fromUserId]: false }));
      alert('Failed to follow back. Please try again.');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [notifId]: false }));
    }
  };

  const handleUnfollow = async (notifId, fromUserId) => {
    setLoadingMap((prev) => ({ ...prev, [notifId]: true }));
    setFollowStatusMap((prev) => ({ ...prev, [fromUserId]: false }));
    try {
      await unfollowUser(currentUserId, fromUserId);
    } catch (err) {
      setFollowStatusMap((prev) => ({ ...prev, [fromUserId]: true }));
      alert('Failed to unfollow. Please try again.');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [notifId]: false }));
    }
  };

  const handleUserClick = (userName, userRole) => {
    const profileUrl = createProfileUrl(userName, userRole);
    navigate(profileUrl);
  };

  return (
    <div className="p-4 notifications-responsive" ref={containerRef} style={{
      transform: `translateY(${pullDistance}px)`,
      transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
    }}>
      {pullDistance > 0 && (
        <div className="flex justify-center items-center py-4 text-gray-500">
          {pullDistance >= PULL_THRESHOLD ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
              Release to refresh
            </div>
          ) : (
            <div className="flex items-center">
              <div className="mr-2">↓</div>
              Pull down to refresh
            </div>
          )}
        </div>
      )}
      {(loading || !followStatusLoaded) ? (
        <div className="mt-8 flex justify-center"><ChallengeLoader /></div>
      ) : error ? (
        <div className="mt-8 text-center text-red-500">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">No notifications.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {notifications.map((notif) => {
            const fromUserId = notif.fromUser.id;
            const isFollowing = followStatusMap[fromUserId] || false;
            let message = '';
            if (notif.type === 'challenge_submission') {
              message = (
                <>
                  Submitted an attempt for <span style={{ color: '#FF0505', fontWeight: 600 }}>{notif.challengeTitle || 'this challenge'}</span>
                </>
              );
            } else if (notif.type === 'challenge_review') {
              const challengeName = notif.challengeTitle || 'this challenge';
              const action = notif.reviewResult === 'approve' ? 'approved' : 'rejected';
              message = (
                <>
                  <span style={{ color: '#FF0505', fontWeight: 600 }}>{challengeName}</span> has been {action}
                </>
              );
            } else if (notif.type === 'like_post') {
              message = 'Liked your post.';
            } else if (notif.type === 'comment_post') {
              message = 'Commented on your post.';
            } else if (notif.type === 'follow') {
              message = 'Started following you.';
            } else if (notif.type === 'profile_view') {
              message = (
                <span style={{ fontWeight: 600 }}>
                  A scout has viewed your profile!
                </span>
              );
            } else {
              message = 'Interacted with your content.';
            }
            if (notif.type === 'follow') {
              return (
                <div key={notif.id} className="notification-row-modern">
                  <div className="notification-avatar">
                    {notif.fromUser.profilePictureUrl ? (
                      <img
                        src={notif.fromUser.profilePictureUrl}
                        alt={notif.fromUser.name}
                        className="notification-avatar-img"
                      />
                    ) : (
                      <span className="notification-avatar-initial">{notif.fromUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="notification-content">
                    <div className="notification-username">{notif.fromUser.name}</div>
                    <div className="notification-message">{message}</div>
                    {notif.createdAt && (
                      <div className="notification-date">{new Date(notif.createdAt).toLocaleString()}</div>
                    )}
                  </div>
                  <div className="notification-action">
                    <FollowButton
                      isFollowing={isFollowing}
                      loading={!!loadingMap[notif.id]}
                      onFollow={() => handleFollowBack(notif.id, fromUserId)}
                      onUnfollow={() => handleUnfollow(notif.id, fromUserId)}
                      className="notification-follow-btn"
                    />
                  </div>
                </div>
              );
            } else {
              return (
                <div key={notif.id} className="flex items-center bg-white rounded-lg shadow p-4">
                  <div 
                    className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl mr-4 cursor-pointer hover:opacity-80"
                    onClick={() => handleUserClick(notif.fromUser.name, notif.fromUser.role)}
                  >
                    {notif.fromUser.profilePictureUrl ? (
                      <img
                        src={notif.fromUser.profilePictureUrl}
                        alt={notif.fromUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span>{notif.fromUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div 
                      className={notif.type === 'profile_view' ? 'font-semibold text-gray-800 cursor-pointer hover:text-red-600 hover:underline' : 'font-semibold text-gray-800 cursor-pointer hover:text-red-600 hover:underline'}
                      style={notif.type === 'profile_view' ? { fontWeight: 700, cursor: 'pointer' } : {}}
                      onClick={() => handleUserClick(notif.fromUser.name, notif.fromUser.role)}
                    >
                      {notif.fromUser.name}
                    </div>
                    <div className={notif.type === 'profile_view' ? 'text-gray-800' : 'text-gray-500 text-sm'} style={notif.type === 'profile_view' ? { fontWeight: 600 } : {}}>{message}</div>
                    {notif.createdAt && (
                      <div className="text-xs text-gray-300">{new Date(notif.createdAt).toLocaleString()}</div>
                    )}
                  </div>
                  {notif.type === 'challenge_review' && (
                    <div className="ml-4" style={{ minWidth: 80 }}>
                      {notif.submissionVideoUrl ? (
                        <video
                          src={notif.submissionVideoUrl}
                          className="w-16 h-16 object-cover rounded-lg"
                          style={{ minWidth: 64, minHeight: 64 }}
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          No video
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;