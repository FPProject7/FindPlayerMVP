// frontend/src/pages/MessagesPage.jsx

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';

export default function MessagesPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const location = useLocation();

  // Check if we're opening a specific conversation from URL (optional: can be removed if not needed)
  React.useEffect(() => {
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
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
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