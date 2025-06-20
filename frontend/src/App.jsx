import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChallengesPage from './pages/ChallengesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import LoginPromptModal from "./components/common/LoginPromptModal";
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Paths where the modal should NEVER show (auth forms themselves)
    const authRelatedPaths = ['/login', '/signup', '/reset-password'];
    // Paths that are fully public content AND should NOT be blocked by the modal
    const trulyPublicPages = ['/events'];

    const isAuthRelatedPath = authRelatedPaths.includes(location.pathname);
    const isTrulyPublicPage = trulyPublicPages.includes(location.pathname);

    // Logic for showing the modal:
    // The modal shows IF:
    // 1. The user is NOT authenticated
    // 2. The current path is NOT an authentication-related path
    // 3. The current path is NOT a truly public page (like /events)
    if (!isAuthenticated && !isAuthRelatedPath && !isTrulyPublicPage) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname, isAuthenticated]);

  return (
    <>
      {/* The modal is rendered here, outside the Routes, so it can overlay everything */}
      {showModal && <LoginPromptModal />}

      <Routes>
        {/* Public Routes - These are the actual login/signup/reset forms. */}
        {/* They should not be wrapped by MainLayout if MainLayout includes things like a nav bar that expects content underneath. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Main Application Content Routes (Including the "Events" page) */}
        {/* All these pages will be wrapped by MainLayout. */}
        {/* The LoginPromptModal will overlay them if the user is not authenticated,
            except for the /events page as per your requirement. */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/events" element={<EventsPage />} /> {/* This is now a fully public route, not blocked by ProtectedRoute */}
          {/* Add any other app content routes here */}
        </Route>

        {/* Fallback route: If no other route matches, handle redirect. */}
        {/* If authenticated and hits an undefined route, go to /home. */}
        {/* If unauthenticated and hits an undefined route, still allows them to land on it,
            but the modal will likely show, prompting login. */}
        {/* This specific catch-all might need fine-tuning depending on how you want to handle truly non-existent URLs. */}
        {/* For now, it will simply render the MainLayout (with HomePage) and the modal if unauthenticated. */}
        <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
      </Routes>
    </>
  );
}

export default App;