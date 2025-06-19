// frontend/src/App.jsx

import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ChallengesPage from './pages/ChallengesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import EventsPage from './pages/EventsPage';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

// This is a special component to handle routes for logged-out users
const PublicRoutes = ({ isAuthenticated }) => {
  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

// This is a special component to handle routes for logged-in users
const ProtectedRoutes = ({ isAuthenticated }) => {
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};


function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* --- PUBLIC AUTH ROUTES --- */}
      {/* If a user is logged in, trying to access these will redirect them to the homepage */}
      <Route element={<PublicRoutes isAuthenticated={isAuthenticated} />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* --- PROTECTED APP ROUTES --- */}
      {/* If a user is not logged in, trying to access these will redirect them to the login page */}
      <Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          {/* Add other protected pages here */}
        </Route>
      </Route>

      {/* A final catch-all to redirect any unknown URL to the correct starting page */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;