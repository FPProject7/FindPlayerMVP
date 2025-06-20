import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChallengesPage from './pages/ChallengesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import LoginPromptModal from "./components/common/LoginPromptModal";

function App() {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

 useEffect(() => {
  const mainPaths = ['/', '/challenges', '/leaderboard', '/events'];
  const authPaths = ['/login', '/signup', '/reset-password'];
  
  if (authPaths.includes(location.pathname)) {
    setShowModal(false);
    return;
  }

  const onMainPath = mainPaths.some(p => location.pathname.startsWith(p));

  if (onMainPath && location.pathname !== '/events') {
    setShowModal(true);
  } else {
    setShowModal(false);
  }
}, [location.pathname]);

  return (
    <>
      {showModal && <LoginPromptModal />} 

      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </>
  );
}

export default App;