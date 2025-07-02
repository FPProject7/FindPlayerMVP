import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

export default function ChatWindow() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const { user } = useAuthStore();
  const myId = user?.sub || user?.id;
  const messagesEndRef = useRef(null);

  // Check if this is a new conversation (no conversationId yet)
  const isNewConversation = !currentConversationId || currentConversationId === 'new';

  // Helper to get the real recipient UUID
  function getOtherUserId() {
    if (isNewConversation) {
      const params = new URLSearchParams(location.search);
      return params.get('userId');
    }
    // For existing conversations, parse the conversationId
    if (conversationId && conversationId !== 'new') {
      const ids = conversationId.split('_');
      return ids.find(id => id !== myId);
    }
    return null;
  }

  // Fetch messages - skip for new conversations
  const { data, loading, error, refetch } = useQuery(GET_MESSAGES, {
    variables: { conversationId: currentConversationId, limit: 50 },
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

    const receiverId = getOtherUserId();
    if (!receiverId || receiverId === 'new' || receiverId === myId) {
      alert('Invalid recipient. Please select a valid user to chat with.');
      return;
    }
    console.log('[ChatWindow] Sending message to receiverId:', receiverId);
    try {
      const result = await sendMessage({
        variables: {
          input: {
            receiverId: receiverId,
            content: input,
          },
        },
      });
      
      // If this was a new conversation, update the conversationId
      if (isNewConversation && result.data?.sendMessage?.userConversation?.conversationId) {
        const newConversationId = result.data.sendMessage.userConversation.conversationId;
        setCurrentConversationId(newConversationId);
        // Update the URL to use the new conversationId
        navigate(`/messages/${newConversationId}`, { replace: true });
      }
      
      // Refetch messages to show the new message immediately
      if (currentConversationId) {
        await refetch();
      }
      
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!currentConversationId) return <div>No conversation selected.</div>;
  if (loading && !isNewConversation) return <div>Loading messages...</div>;
  if (error && !isNewConversation) return <div>Error loading messages.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/messages')} style={{ marginRight: 12 }}>&larr;</button>
          <div style={{ fontWeight: 600 }}>Conversation</div>
        </div>
        {currentConversationId && !isNewConversation && (
          <button 
            onClick={() => refetch()} 
            style={{ 
              padding: '4px 8px', 
              fontSize: 12, 
              background: '#f0f0f0', 
              border: '1px solid #ddd', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        )}
      </div>
      {/* Messages */}
      <div className="chat-messages-container">
        {isNewConversation ? (
          <div className="chat-start-message">
            Start a new conversation
          </div>
        ) : (
          messages.map(msg => {
            // Use user.sub or user.id for sender check
            const isMe = msg.senderId === (user?.sub || user?.id);
            return (
              <div
                key={msg.messageId}
                className={`chat-message-row ${isMe ? 'sent' : 'received'}`}
              >
                <div
                  className={`chat-message-bubble ${isMe ? 'sent-bubble' : 'received-bubble'}`}
                >
                  {msg.content}
                  <div className="chat-message-time">
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
      <form onSubmit={handleSend} style={{ display: 'flex', padding: 12, borderTop: '1px solid #eee', background: '#fff' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message..."
          style={{ flex: 1, padding: 10, borderRadius: 16, border: '1px solid #ddd', fontSize: 15 }}
        />
        <button type="submit" disabled={sending || !input.trim()} style={{ marginLeft: 8, padding: '0 18px', borderRadius: 16, background: '#ff3b30', color: '#fff', border: 'none', fontWeight: 600 }}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
} 