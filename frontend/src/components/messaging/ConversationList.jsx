import React, { useState, useEffect, useRef } from 'react';
import { useQuery, gql } from '@apollo/client';
import { searchUsers } from '../../api/userApi';
import ChallengeLoader from '../common/ChallengeLoader';

// Utility to get initials from a name
function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const LIST_CONVERSATIONS = gql`
  query ListConversations($limit: Int, $nextToken: String) {
    listConversations(limit: $limit, nextToken: $nextToken) {
      items {
        conversationId
        otherUserId
        otherUserName
        otherUserProfilePic
        lastMessageContent
        lastMessageTimestamp
        unreadCount
      }
      nextToken
    }
  }
`;

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

export default function ConversationList({ onSelectConversation }) {
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const { data, loading, error, refetch } = useQuery(LIST_CONVERSATIONS, {
    variables: { limit: 20 },
    fetchPolicy: 'cache-and-network',
  });

  // Local state for conversations to allow instant UI updates
  const [conversations, setConversations] = useState([]);

  // Sync local conversations state with data from backend
  useEffect(() => {
    if (data?.listConversations?.items) {
      setConversations(data.listConversations.items);
    }
  }, [data]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setUserResults([]);
      setShowUserDropdown(false);
      return;
    }
    setUserLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const users = await searchUsers(search.trim());
        setUserResults(users);
        setShowUserDropdown(true);
      } catch {
        setUserResults([]);
        setShowUserDropdown(false);
      } finally {
        setUserLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

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
      setRefreshing(true);
      refetch().finally(() => setRefreshing(false));
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
  }, [loading, pullDistance]);

  const handleStartChat = (user) => {
    setShowUserDropdown(false);
    setSearch('');
    onSelectConversation({
      conversationId: 'new',
      name: user.name,
      profilePic: user.profile_picture_url,
      userId: user.id
    });
  };

  // When a conversation is clicked, set its unreadCount to 0 instantly
  const handleConversationClick = (conv) => {
    setConversations(prev =>
      prev.map(c =>
        c.conversationId === conv.conversationId
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
    onSelectConversation({
      conversationId: conv.conversationId,
      name: conv.otherUserName,
      profilePic: conv.otherUserProfilePic,
      userId: conv.otherUserId
    });
  };

  if (loading && !refreshing) return <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>;
  if (error) return <div className="flex justify-center items-center py-8 text-red-500">{error.message || 'Error loading conversations.'}</div>;

  const filtered = conversations.filter(
    c =>
      c.otherUserName?.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessageContent?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="conversation-list-container"
      ref={containerRef}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull to Refresh Indicator */}
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
      {refreshing && (
        <div className="flex justify-center items-center py-2 text-gray-500">
          <ChallengeLoader />
        </div>
      )}
      <div className="conversation-search-bar">
        <input
          type="text"
          placeholder="Search for Teammates, Coaches, Scouts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
          onFocus={() => { if (userResults.length > 0) setShowUserDropdown(true); }}
          onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
        />
        {showUserDropdown && (
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
            {userLoading && <div style={{ padding: 12, color: '#888' }}>Searching...</div>}
            {!userLoading && userResults.length === 0 && <div style={{ padding: 12, color: '#888' }}>No users found.</div>}
            {userResults.map(user => (
              <div
                key={user.id}
                onMouseDown={() => handleStartChat(user)}
                style={{ display: 'flex', alignItems: 'center', padding: 10, cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
              >
                {user.profile_picture_url ? (
                  <img src={user.profile_picture_url} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10, objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#eee',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 15,
                    marginRight: 10,
                  }}>{getInitials(user.name)}</div>
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
      <div className="conversation-list-scroll">
        {filtered.length === 0 && <div style={{ padding: 16, color: '#888', textAlign: 'center' }}>No conversations yet.<br/>Start a chat to see your conversations here.</div>}
        {filtered.map(conv => (
          <div
            key={conv.conversationId}
            onClick={() => handleConversationClick(conv)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 12,
              borderBottom: '1px solid #f0f0f0',
              cursor: 'pointer',
              background: conv.unreadCount > 0 ? '#f6faff' : '#fff',
            }}
          >
            {/* Avatar */}
            {conv.otherUserProfilePic ? (
              <img src={conv.otherUserProfilePic} alt={conv.otherUserName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', marginRight: 12 }} />
            ) : (
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#eee',
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 18,
                marginRight: 12,
              }}>{getInitials(conv.otherUserName)}</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: conv.unreadCount > 0 ? 700 : 600,
                color: conv.unreadCount > 0 ? '#1f2937' : '#374151'
              }}>
                {conv.otherUserName}
              </div>
              <div style={{ 
                color: conv.unreadCount > 0 ? '#1f2937' : '#888', 
                fontSize: 13, 
                marginTop: 2, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontWeight: conv.unreadCount > 0 ? 600 : 400
              }}>
                {conv.lastMessageContent && conv.lastMessageContent.length > 50
                  ? conv.lastMessageContent.slice(0, 50) + '...'
                  : conv.lastMessageContent}
              </div>
            </div>
            <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ color: '#aaa', fontSize: 12 }}>
                {conv.lastMessageTimestamp && new Date(conv.lastMessageTimestamp).toLocaleDateString()}
              </div>
              {conv.unreadCount > 0 && (
                <div style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  width: 8,
                  height: 8,
                  marginTop: 4
                }}></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 