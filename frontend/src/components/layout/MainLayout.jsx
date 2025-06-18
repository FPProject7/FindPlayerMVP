// frontend/src/components/layout/MainLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';
import './Layout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <main>
        <Outlet />
      </main>

      <footer className="nav-wrapper">
        <BottomNavBar />
      </footer>
    </div>
  );
};

export default MainLayout;