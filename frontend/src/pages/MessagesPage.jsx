// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Responsive: show list and chat side by side on desktop, stacked on mobile
  const isMobile = window.innerWidth < 700;

  return (
    <div className="chat-main-layout">
      {/* Conversation List */}
      <div className="conversation-list-outer">
        <ConversationList onSelectConversation={conv => setSelectedConversation(conv)} />
      </div>
      {/* Chat Window */}
      {!isMobile && (
        <div className="chat-window-outer">
          {selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div className="chat-placeholder">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      )}
      {/* On mobile, show chat window as overlay */}
      {isMobile && selectedConversation && (
        <div className="chat-mobile-overlay">
          <ChatWindow conversation={selectedConversation} onBack={() => setSelectedConversation(null)} />
        </div>
      )}
    </div>
  );
}