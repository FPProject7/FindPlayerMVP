import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
import { useTokenRefresh } from './hooks/useTokenRefresh';

// Existing new page imports
import UserProfilePage from './pages/UserProfilePage';
import ScoutDashboardPage from './pages/ScoutDashboardPage';
// --- NEW: Notifications & Messages Page Imports ---
import NotificationsPage from './pages/NotificationsPage'; // <--- New page import
import MessagesPage from './pages/MessagesPage';         // <--- New page import
// --- END NEW ---
import ReviewSubmissionPage from './pages/challenges/ReviewModal';

// ProtectedRoute Component (remains unchanged)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

// RoleProtectedRoute Component (remains unchanged)
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const userRoleLower = user?.role?.toLowerCase();
  const allowedRolesLower = allowedRoles.map(role => role.toLowerCase());
  if (allowedRolesLower.length > 0 && userRoleLower && !allowedRolesLower.includes(userRoleLower)) {
    console.warn(`Access Denied: User role '${user.role}' not in allowed roles [${allowedRoles.join(', ')}] for path ${location.pathname}`);
    alert("Access Denied: You do not have permission to view this page.");
    return <Navigate to="/home" replace />;
  }
  return children;
};


function App() {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Added new pages to trulyPublicPages for modal logic
    const authRelatedPaths = ['/login', '/signup', '/reset-password'];
    const trulyPublicPages = ['/events', '/profile', '/scout-dashboard', '/notifications', '/messages']; // <--- Added new pages here

    const isAuthRelatedPath = authRelatedPaths.includes(location.pathname);
    const isTrulyPublicPage = trulyPublicPages.includes(location.pathname);

    if (!isAuthenticated && !isAuthRelatedPath && !isTrulyPublicPage) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname, isAuthenticated]);

  useTokenRefresh();

  return (
    <>
      {showModal && <LoginPromptModal />}

      <Routes>
        {/* Public Routes - Authentication forms (no MainLayout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Public Content Route - Accessible to all, not blocked by modal */}
        <Route path="/events" element={<MainLayout><EventsPage /></MainLayout>} />
        
        {/* Main Application Content Routes (Viewable with modal if unauthenticated) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} /> 
          <Route path="/home" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/coach/challenges/:challengeId/submissions/:submissionId" element={<ProtectedRoute><ReviewSubmissionPage /></ProtectedRoute>} />
        </Route>

        {/* Truly Protected Routes (Requires authentication, no modal overlay) */}
        {/* These routes load only if authenticated, and are also wrapped by MainLayout. */}
        <Route element={<MainLayout />}>
            <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} /> 
            <Route path="/profile/:profileUserId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} /> 
            <Route path="/scout-dashboard" element={<RoleProtectedRoute allowedRoles={['Scout']}><ScoutDashboardPage /></RoleProtectedRoute>} /> 
            {/* --- NEW: Protected Notifications & Messages Routes --- */}
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} /> {/* <--- New Route */}
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />             {/* <--- New Route */}
            {/* --- END NEW --- */}
        </Route>

        {/* Catch-all route */}
        <Route 
          path="*" 
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </>
  );
}

export default App;