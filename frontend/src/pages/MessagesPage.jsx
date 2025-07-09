// frontend/src/pages/MessagesPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';

export default function MessagesPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);

  // Restore selected conversation from localStorage on mount (if not coming from location.state)
  useEffect(() => {
    if (!initialized && !location.state?.openChatWith) {
      const saved = localStorage.getItem('selectedConversation');
      if (saved) {
        setSelectedConversation(JSON.parse(saved));
        setIsChatOpen(true);
        // Not in booking flow, clear the flag
        localStorage.removeItem('bookingFlow');
      }
      setInitialized(true);
    }
  }, [initialized, location.state]);

  // On mount, open chat if location.state.openChatWith is present
  useEffect(() => {
    if (!initialized && location.state && location.state.openChatWith) {
      setSelectedConversation({
        conversationId: 'new',
        name: location.state.openChatWith.name,
        profilePic: location.state.openChatWith.profilePic,
        userId: location.state.openChatWith.userId
      });
      setIsChatOpen(true);
      setInitialized(true);
      // Set sessionStorage flag and message for automated message prompt
      sessionStorage.setItem('showAutomatedMessage', 'true');
      sessionStorage.setItem('automatedMessageText', `Hi ${location.state.openChatWith.name || 'Coach'}! I'm interested in booking a training session with you. What's your availability like?`);
      // Immediately redirect to /messages without state so refresh doesn't re-trigger booking flow
      setTimeout(() => navigate('/messages', { replace: true }), 0);
    }
  }, [location.state, initialized, navigate]);

  // Save selected conversation to localStorage whenever it changes
  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem('selectedConversation', JSON.stringify(selectedConversation));
    }
  }, [selectedConversation]);

  // Check if we're opening a specific conversation from URL (optional: can be removed if not needed)
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[2] && pathParts[2] !== 'new') {
      setSelectedConversation({ conversationId: pathParts[2] });
      setIsChatOpen(true);
    } else if (pathParts[2] === 'new') {
      setSelectedConversation({ conversationId: 'new' });
      setIsChatOpen(true);
    }
  }, [location]);

  const handleConversationSelect = (convObj) => {
    setSelectedConversation(convObj);
    setIsChatOpen(true);
    // Clear booking flow flag on any conversation select
    localStorage.removeItem('bookingFlow');
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    localStorage.removeItem('selectedConversation');
  };

  return (
    <div className="messages-page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Conversation List - always visible */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ConversationList onSelectConversation={handleConversationSelect} />
      </div>
      
      {/* Chat Window Modal */}
      <ChatWindow 
        isOpen={isChatOpen} 
        onClose={handleCloseChat}
        conversationId={selectedConversation?.conversationId}
        otherUserName={selectedConversation?.name}
        otherUserProfilePic={selectedConversation?.profilePic}
        otherUserId={selectedConversation?.userId}
      />
    </div>
  );
}