import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ChallengeLoader from '../common/ChallengeLoader';
import { markMessagesRead } from '../../api/followApi';
import './ChatWindow.css';

const GET_MESSAGES = gql`
  query GetConversationMessages($conversationId: ID!, $limit: Int) {
    getConversationMessages(conversationId: $conversationId, limit: $limit) {
      items {
        messageId
        senderId
        receiverId
        content
        timestamp
        readStatus
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      message {
        messageId
        senderId
        receiverId
        content
        timestamp
        readStatus
      }
      userConversation {
        conversationId
        otherUserId
        lastMessageContent
        lastMessageTimestamp
      }
    }
  }
`;

const ON_NEW_MESSAGE = gql`
  subscription OnNewMessage($conversationId: ID!) {
    onNewMessage(conversationId: $conversationId) {
      message {
        messageId
        senderId
        receiverId
        content
        timestamp
        readStatus
      }
      userConversation {
        conversationId
        otherUserId
        lastMessageContent
        lastMessageTimestamp
      }
    }
  }
`;

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

export default function ChatWindow({ isOpen, onClose, conversationId, otherUserName, otherUserProfilePic, otherUserId, dbUser }) {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const { user } = useAuthStore();
  const myId = user?.sub || user?.id;
  const myName = user?.name || '';
  const myProfilePic = user?.profile_picture_url || '';
  const messagesEndRef = useRef(null);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const messagesContainerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAutomatedMessage, setShowAutomatedMessage] = useState(false);
  const [automatedMessageText, setAutomatedMessageText] = useState('');
  const [autoMessageHandled, setAutoMessageHandled] = useState(false);

  // Update currentConversationId when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);

  // Check if this is a new conversation (no conversationId yet)
  const isNewConversation = !currentConversationId || currentConversationId === 'new';

  // Check if this is a new conversation opened from "Book a Session" button
  useEffect(() => {
    // Only show automated message if coming from booking flow (location.state.openChatWith)
    if (isNewConversation && location.state?.openChatWith && user?.role?.toLowerCase() === 'athlete') {
      setShowAutomatedMessage(true);
      setAutomatedMessageText(`Hi ${otherUserName || 'Coach'}! I'm interested in booking a training session with you. What's your availability like?`);
      // Clear the bookingFlow flag immediately so it doesn't persist after first render
      localStorage.removeItem('bookingFlow');
    } else {
      setShowAutomatedMessage(false);
      setAutomatedMessageText('');
      // Also clear the flag if not in booking flow
      localStorage.removeItem('bookingFlow');
    }
  }, [isNewConversation, location.state, user?.role, otherUserName]);

  // Prefill chat input with automated message if sessionStorage flag is set
  useEffect(() => {
    if (isNewConversation && sessionStorage.getItem('showAutomatedMessage') === 'true') {
      const autoMsg = sessionStorage.getItem('automatedMessageText');
      if (autoMsg) {
        setInput(autoMsg);
        setAutoMessageHandled(true);
      }
      sessionStorage.removeItem('showAutomatedMessage');
      sessionStorage.removeItem('automatedMessageText');
    } else {
      setAutoMessageHandled(false);
    }
  }, [isNewConversation, otherUserId, conversationId]);

  // Reset input when starting a new conversation, unless booking flow flag is set
  useEffect(() => {
    if (
      isNewConversation &&
      !autoMessageHandled &&
      sessionStorage.getItem('showAutomatedMessage') !== 'true'
    ) {
      setInput('');
    }
  }, [isNewConversation, otherUserId, conversationId, autoMessageHandled]);

  // Helper to get the real recipient UUID and name/profilePic
  function getOtherUserInfo() {
    if (isNewConversation) {
      const params = new URLSearchParams(location.search);
      return {
        id: params.get('userId'),
        name: params.get('userName') || '',
        profilePic: params.get('userProfilePic') || '',
      };
    }
    if (conversationId && conversationId !== 'new') {
      const ids = conversationId.split('_');
      const otherId = ids.find(id => id !== myId);
      let name = '';
      let profilePic = '';
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderId === otherId) {
          name = lastMsg.senderName || '';
          profilePic = lastMsg.senderProfilePic || '';
        } else if (lastMsg.receiverId === otherId) {
          name = lastMsg.receiverName || '';
          profilePic = lastMsg.receiverProfilePic || '';
        }
      }
      return { id: otherId, name, profilePic };
    }
    return { id: null, name: '', profilePic: '' };
  }

  const otherUser = getOtherUserInfo();

  // Fetch messages - always call useQuery but skip execution when needed
  const { data, loading, error, refetch } = useQuery(GET_MESSAGES, {
    variables: { conversationId: currentConversationId || 'placeholder', limit: 50 },
    fetchPolicy: 'network-only',
    skip: !currentConversationId || isNewConversation,
  });

  // Send message mutation
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  // Subscribe to new messages - skip for new conversations
  // Temporarily disabled due to WebSocket connection issues
  /*
  useSubscription(ON_NEW_MESSAGE, {
    variables: { conversationId: currentConversationId },
    skip: !currentConversationId,
    onData: ({ data: subData }) => {
      const newMsg = subData?.data?.onNewMessage?.message;
      if (newMsg) {
        setMessages(prev => {
          if (prev.some(m => m.messageId === newMsg.messageId)) return prev;
          return [...prev, newMsg];
        });
      }
    },
  });
  */

  // Update messages when query data changes
  useEffect(() => {
    if (data?.getConversationMessages?.items) {
      setMessages(data.getConversationMessages.items);
      
      // Mark messages as read when conversation is opened
      if (currentConversationId && currentConversationId !== 'new') {
        try {
          markMessagesRead(currentConversationId);
          // Trigger a page refresh to update unread counts in TopNavBar
          // This is a simple solution - in a more complex app you might use a state management solution
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('messagesRead'));
          }, 100);
        } catch (markError) {
          console.error('Failed to mark messages as read:', markError);
        }
      }
    }
  }, [data, currentConversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pull-to-refresh handlers for messages
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
    if (distance > 0 && messagesContainerRef.current && messagesContainerRef.current.scrollTop === 0) {
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
    const container = messagesContainerRef.current;
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

  // Remove useAuthStore premium checks
  // Use dbUser for all premium/verified checks
  const isPremium = dbUser?.is_premium_member;
  const isScout = dbUser?.role === 'scout';
  const isVerified = dbUser?.is_verified;
  const canSendMessages = isPremium && (!isScout || isVerified);

  const handleSendAutomatedMessage = async () => {
    if (!automatedMessageText.trim()) return;
    const receiverId = otherUserId;
    if (!receiverId || receiverId === 'new' || receiverId === myId) {
      setErrorMessage('Invalid recipient. Please select a valid user to chat with.');
      setTimeout(() => setErrorMessage(''), 2000);
      return;
    }
    // Use dbUser for premium check
    if (!canSendMessages) {
      setErrorMessage('Premium Feature - Upgrade to send messages');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    try {
      const result = await sendMessage({
        variables: {
          input: {
            receiverId: receiverId,
            content: automatedMessageText,
          },
        },
      });
      if (isNewConversation && result.data?.sendMessage?.userConversation?.conversationId) {
        const newConversationId = result.data.sendMessage.userConversation.conversationId;
        setCurrentConversationId(newConversationId);
      }
      if (currentConversationId) {
        await refetch();
      }
      setShowAutomatedMessage(false);
      
      // Trigger unread counts refresh after sending message
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('messagesRead'));
      }, 100);
    } catch (error) {
      const msg = error?.message || error?.graphQLErrors?.[0]?.message || '';
      if (msg.includes('Only premium members can use messaging.')) {
        setErrorMessage('Premium Feature');
        setTimeout(() => setErrorMessage(''), 2000);
      } else {
        setErrorMessage(msg || 'Failed to send message.');
        setTimeout(() => setErrorMessage(''), 2000);
      }
      console.error('Error sending automated message:', error);
    }
  };

  const handleSend = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    const receiverId = otherUserId;
    if (!receiverId || receiverId === 'new' || receiverId === myId) {
      setErrorMessage('Invalid recipient. Please select a valid user to chat with.');
      setTimeout(() => setErrorMessage(''), 2000);
      return;
    }
    // Use dbUser for premium check
    if (!canSendMessages) {
      setErrorMessage('Premium Feature - Upgrade to send messages');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    try {
      const result = await sendMessage({
        variables: {
          input: {
            receiverId: receiverId,
            content: input,
          },
        },
      });
      if (isNewConversation && result.data?.sendMessage?.userConversation?.conversationId) {
        const newConversationId = result.data.sendMessage.userConversation.conversationId;
        setCurrentConversationId(newConversationId);
      }
      if (currentConversationId) {
        await refetch();
      }
      setInput('');
      
      // Trigger unread counts refresh after sending message
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('messagesRead'));
      }, 100);
    } catch (error) {
      // Show styled popup for non-premium error
      const msg = error?.message || error?.graphQLErrors?.[0]?.message || '';
      if (msg.includes('Only premium members can use messaging.')) {
        setErrorMessage('Premium Feature');
        setTimeout(() => setErrorMessage(''), 2000);
      } else {
        setErrorMessage(msg || 'Failed to send message.');
        setTimeout(() => setErrorMessage(''), 2000);
      }
      console.error('Error sending message:', error);
    }
  };



  // Helper to get initials from a name
  function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Modal not open - return null after all hooks are called
  if (!isOpen) return null;

  // Modal content
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-0" style={{ minHeight: '100vh' }}>
      {/* Error Popup */}
      {errorMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-red-700 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out max-w-xs w-auto text-center">
            {errorMessage}
          </div>
        </div>
      )}
      <div className="bg-white w-full max-w-[380px] mx-auto flex flex-col" style={{ height: '70vh', borderRadius: 24, boxShadow: '0 4px 32px rgba(0,0,0,0.12)', overflow: 'hidden', position: 'relative' }}>
        {/* Header */}
        <div className="flex items-center border-b px-4 py-3 bg-white z-10 relative" style={{ minHeight: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          {/* Other participant's profile pic and name (from props) */}
          {otherUserProfilePic ? (
            <img src={otherUserProfilePic} alt={otherUserName} className="w-10 h-10 rounded-full object-cover mr-3" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-lg mr-3">
              {otherUserName ? getInitials(otherUserName) : '?'}
            </div>
          )}
          <span className="font-semibold text-base truncate">{otherUserName || 'Recipient'}</span>
          {/* Close button in top right */}
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500 hover:text-gray-700 font-bold" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
        </div>
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-4 bg-[#f8f8fa]"
          style={{ minHeight: 0, transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none' }}
          ref={messagesContainerRef}
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
          {loading && !refreshing ? (
            <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>
          ) : (
            <>
              {/* Automated message for booking sessions - show for both new and existing conversations */}
              {showAutomatedMessage && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2 font-medium">Suggested message:</div>
                  <div className="text-gray-800 mb-3">{automatedMessageText}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleSendAutomatedMessage(); localStorage.removeItem('bookingFlow'); }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Send Message
                    </button>
                    <button
                      onClick={() => {
                        setInput(automatedMessageText);
                        setShowAutomatedMessage(false);
                        localStorage.removeItem('bookingFlow');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Edit & Send
                    </button>
                    <button
                      onClick={() => { setShowAutomatedMessage(false); localStorage.removeItem('bookingFlow'); }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              
              {isNewConversation ? (
                <div className="text-center text-gray-400 mt-10">Start a new conversation</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === myId;
                  const isUnread = !isMe && msg.readStatus === 'SENT'; // Only show unread for messages from others that are SENT
                  return (
                    <div
                      key={msg.messageId}
                      className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2 max-w-[75%] text-[15px] break-words shadow-sm ${isMe ? 'bg-[#FF0505] text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'} ${isUnread ? 'font-bold bg-blue-50 border-2 border-blue-200' : ''}`}
                      >
                        {msg.content}
                        <div className="text-xs mt-1 text-right" style={{ color: isMe ? '#ffe' : '#888' }}>
                          {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center border-t px-4 py-3 bg-white sticky bottom-0 z-10" style={{ minHeight: 60 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 p-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400 text-[15px]"
            style={{ marginRight: 12 }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="ml-2 px-6 py-2 rounded-full font-bold text-white bg-[#FF0505] hover:bg-[#CC0000] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 