// frontend/src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChallengesPage from './pages/ChallengesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

function App() {
  return (
    <Routes>
      {/* All routes inside here will share the MainLayout (with the bottom nav bar) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/events" element={<EventsPage />} />
        {/* Add other main page routes here */}
      </Route>

      {/* Auth pages (without MainLayout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    
    </Routes>
  );
}

export default App;