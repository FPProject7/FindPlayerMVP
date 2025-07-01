import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { useAuthStore } from '../../stores/useAuthStore';

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
    }
  }
`;

export default function ChatWindow({ conversation, onBack }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const { user } = useAuthStore();
  const messagesEndRef = useRef(null);

  // Fetch messages
  const { data, loading, error, refetch } = useQuery(GET_MESSAGES, {
    variables: { conversationId: conversation.conversationId, limit: 50 },
    fetchPolicy: 'network-only',
    skip: !conversation,
  });

  // Send message mutation
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE);

  // Subscribe to new messages
  useSubscription(ON_NEW_MESSAGE, {
    variables: { conversationId: conversation.conversationId },
    skip: !conversation,
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
    await sendMessage({
      variables: {
        input: {
          receiverId: conversation.otherUserId,
          content: input,
        },
      },
    });
    setInput('');
    refetch();
  };

  if (!conversation) return <div>Select a conversation</div>;
  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error loading messages.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
        {onBack && (
          <button onClick={onBack} style={{ marginRight: 12 }}>&larr;</button>
        )}
        <div style={{ fontWeight: 600 }}>{conversation.otherUserName}</div>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f8f8fa' }}>
        {messages.map(msg => {
          const isMe = msg.senderId === user?.sub;
          return (
            <div
              key={msg.messageId}
              style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  background: isMe ? '#ff3b30' : '#eee',
                  color: isMe ? '#fff' : '#222',
                  borderRadius: 16,
                  padding: '8px 14px',
                  maxWidth: 320,
                  fontSize: 15,
                  boxShadow: isMe ? '0 1px 4px #ffd6d6' : '0 1px 2px #eee',
                }}
              >
                {msg.content}
                <div style={{ fontSize: 11, color: isMe ? '#ffe' : '#888', marginTop: 2, textAlign: 'right' }}>
                  {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
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
          Send
        </button>
      </form>
    </div>
  );
} 