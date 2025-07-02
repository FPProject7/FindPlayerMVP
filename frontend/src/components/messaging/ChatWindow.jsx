import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
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

export default function ChatWindow({ isOpen, onClose, conversationId, otherUserName, otherUserProfilePic }) {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const { user } = useAuthStore();
  const myId = user?.sub || user?.id;
  const myName = user?.name || '';
  const myProfilePic = user?.profile_picture_url || '';
  const messagesEndRef = useRef(null);

  // Update currentConversationId when prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId);
  }, [conversationId]);

  // Check if this is a new conversation (no conversationId yet)
  const isNewConversation = !currentConversationId || currentConversationId === 'new';

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
    }
  }, [data]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    const receiverId = otherUser.id;
    if (!receiverId || receiverId === 'new' || receiverId === myId) {
      alert('Invalid recipient. Please select a valid user to chat with.');
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
    } catch (error) {
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
        <div className="flex-1 overflow-y-auto px-3 py-4 bg-[#f8f8fa]" style={{ minHeight: 0 }}>
          {isNewConversation ? (
            <div className="text-center text-gray-400 mt-10">Start a new conversation</div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === myId;
              return (
                <div
                  key={msg.messageId}
                  className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[75%] text-[15px] break-words shadow-sm ${isMe ? 'bg-[#ff3b30] text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}
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
            className="ml-2 px-6 py-2 rounded-full font-bold text-white bg-[#ff3b30] hover:bg-[#e22c1a] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 