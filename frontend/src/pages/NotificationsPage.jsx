// frontend/src/pages/NotificationsPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import FollowButton from '../components/common/FollowButton';
import { followUser, getNotifications } from '../api/followApi';
import { useAuthStore } from '../stores/useAuthStore';

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

const NotificationsPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const currentUserId = user?.id;
  const [notifications, setNotifications] = useState([]);
  const [loadingMap, setLoadingMap] = useState({}); // { notifId: boolean }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);

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

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      setLoading(false);
      setError('You must be logged in to view notifications.');
      return;
    }
    fetchNotifications();
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
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, isFollowingBack: true } : n
      )
    );
    try {
      await followUser(currentUserId, fromUserId);
    } catch (err) {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notifId ? { ...n, isFollowingBack: false } : n
        )
      );
      alert('Failed to follow back. Please try again.');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [notifId]: false }));
    }
  };

  return (
    <div className="p-4" ref={containerRef} style={{
      transform: `translateY(${pullDistance}px)`,
      transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
    }}>
      <h1 className="text-2xl font-bold">Notifications</h1>
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
      {loading ? (
        <div className="mt-8 text-center text-gray-500">Loading notifications...</div>
      ) : error ? (
        <div className="mt-8 text-center text-red-500">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">No notifications.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex items-center bg-white rounded-lg shadow p-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl mr-4">
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
                <div className="font-semibold text-gray-800">{notif.fromUser.name}</div>
                <div className="text-gray-500 text-sm">started following you</div>
              </div>
              <div className="ml-4" style={{ minWidth: 120 }}>
                <FollowButton
                  isFollowing={notif.isFollowingBack}
                  loading={!!loadingMap[notif.id]}
                  onFollow={() => handleFollowBack(notif.id, notif.fromUser.id)}
                  onUnfollow={() => {}}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;