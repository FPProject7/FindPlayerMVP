// frontend/src/App.jsx

import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChallengesPage from './pages/ChallengesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

function App() {
  // Simulate auth state; you'll replace this with real logic later (localStorage, token, context)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Routes>
      {/* If logged in → show full app */}
      {isAuthenticated ? (
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/events" element={<EventsPage />} />
        </Route>
      ) : (
        <>
          {/* Not logged in → show only auth routes and public Events */}
          <Route path="/events" element={<EventsPage />} />
          <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/signup" element={<SignUpPage setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;
