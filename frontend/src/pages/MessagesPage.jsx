// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Responsive: show list and chat side by side on desktop, stacked on mobile
  const isMobile = window.innerWidth < 700;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f4f6fa' }}>
      {/* Conversation List */}
      <div style={{ width: isMobile ? '100%' : 350, borderRight: isMobile ? 'none' : '1px solid #eee', height: '100%', overflow: 'auto' }}>
        <ConversationList onSelectConversation={conv => setSelectedConversation(conv)} />
      </div>
      {/* Chat Window */}
      {!isMobile && (
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              Select a conversation to start chatting
            </div>
          )}
        </div>
      )}
      {/* On mobile, show chat window as overlay */}
      {isMobile && selectedConversation && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#fff', zIndex: 10 }}>
          <ChatWindow conversation={selectedConversation} onBack={() => setSelectedConversation(null)} />
        </div>
      )}
    </div>
  );
}