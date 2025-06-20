// frontend/src/pages/UserProfilePage.jsx

import React from 'react';

const UserProfilePage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">User Profile Page</h1>
      <p>This page is accessible only if you are logged in.</p>
      {/* Add user profile content here */}
    </div>
  );
};

export default UserProfilePage;