// frontend/src/pages/ScoutDashboardPage.jsx

import React from 'react';
import { useAuthStore } from '../stores/useAuthStore'; // Import useAuthStore if you want to display user info

const ScoutDashboardPage = () => {
  const { user } = useAuthStore(); // Get user from store

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Scout's Dashboard</h1>
      {user && <p>Welcome, {user.name}! Your role is {user.role}.</p>}
      <p>This page is specifically for Scouts and requires appropriate role access.</p>
      {/* Add scout-specific dashboard content here */}
    </div>
  );
};

export default ScoutDashboardPage;