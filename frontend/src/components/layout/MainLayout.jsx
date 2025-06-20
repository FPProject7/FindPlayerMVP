// frontend/src/components/layout/MainLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';
import TopNavBar from './TopNavBar'; // <--- Import TopNavBar
import './Layout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <TopNavBar /> {/* <--- Render the new TopNavBar here */}
      
      <main className="main-content-with-top-bar"> {/* <--- Added new class for content area */}
        <Outlet />
      </main>

      <footer className="nav-wrapper">
        <BottomNavBar />
      </footer>
    </div>
  );
};

export default MainLayout;