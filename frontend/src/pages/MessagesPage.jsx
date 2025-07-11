// frontend/src/pages/MessagesPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';
import { useAuthStore } from '../stores/useAuthStore';
import { getUserInfo } from '../api/userApi';
import './MessagesPageSE.css';
import ChallengeLoader from '../components/common/ChallengeLoader';

export default function MessagesPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const [dbUser, setDbUser] = useState(null);
  const [dbUserLoading, setDbUserLoading] = useState(true);

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

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setDbUserLoading(true);
      getUserInfo(user.id)
        .then((data) => setDbUser(data))
        .finally(() => setDbUserLoading(false));
    } else {
      setDbUser(null);
      setDbUserLoading(false);
    }
  }, [isAuthenticated, user?.id]);

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

  // Use dbUser for all checks
  const isPremium = dbUser?.is_premium_member;
  const isScout = dbUser?.role === 'scout';
  const isVerified = dbUser?.is_verified;
  // Scouts need BOTH premium and verified; others just need premium
  const hasMessagingAccess = isScout ? (isPremium && isVerified) : isPremium;

  // Determine what message/button to show for scouts
  let scoutMessage = '';
  let scoutButton = '';
  if (isScout) {
    if (!isVerified) {
      scoutMessage = 'Scouts need to be verified to access messaging.';
      scoutButton = 'Get Verified';
    } else if (!isPremium) {
      scoutMessage = 'Scouts need premium membership to access messaging.';
      scoutButton = 'Upgrade to Premium';
    }
  }

  if (!hasMessagingAccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 overflow-hidden">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isScout ? (!isVerified ? 'Verification Required' : 'Premium Feature') : 'Premium Feature'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isScout ? scoutMessage : 'Upgrade to Premium to access messaging features.'}
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors"
          >
            {isScout ? scoutButton : 'Upgrade to Premium'}
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access messaging.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (dbUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <ChallengeLoader />
      </div>
    );
  }

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
        dbUser={dbUser}
      />
    </div>
  );
}