import React, { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../../api/userApi';

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

export default function ConversationList() {
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(LIST_CONVERSATIONS, {
    variables: { limit: 20 },
    fetchPolicy: 'cache-and-network',
  });

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

  const handleStartChat = (user) => {
    setShowUserDropdown(false);
    setSearch('');
    navigate(`/messages/new?userId=${user.id}`);
  };

  if (loading) return <div>Loading conversations...</div>;
  if (error) return <div>Error loading conversations.</div>;

  const conversations = data?.listConversations?.items || [];
  const filtered = conversations.filter(
    c =>
      c.otherUserName?.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessageContent?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="conversation-list-container">
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
                <img src={user.profile_picture_url} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', marginRight: 10, objectFit: 'cover' }} />
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
            onClick={() => navigate(`/messages/${conv.conversationId}`)}
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
              <div style={{ fontWeight: 600 }}>{conv.otherUserName}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {conv.lastMessageContent}
              </div>
            </div>
            <div style={{ marginLeft: 12, color: '#aaa', fontSize: 12 }}>
              {conv.lastMessageTimestamp && new Date(conv.lastMessageTimestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 