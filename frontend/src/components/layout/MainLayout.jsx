// frontend/src/components/layout/MainLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import BottomNavBar from './BottomNavBar';
import TopNavBar from './TopNavBar'; // <--- Import TopNavBar
import './Layout.css';
import { useCreatePostStore } from '../../stores/useCreatePostStore';
import CreatePostModal from '../feed/CreatePostModal';

const libraries = ['places', 'geometry'];

const MainLayout = () => {
  const { isCreateModalOpen, closeCreateModal } = useCreatePostStore();
  
  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <div className="main-layout">
        <TopNavBar /> {/* <--- Render the new TopNavBar here */}
        
        <main className="main-content-with-top-bar"> {/* <--- Added new class for content area */}
          <Outlet />
        </main>

        <footer className="nav-wrapper">
          <BottomNavBar />
        </footer>
        <CreatePostModal isOpen={isCreateModalOpen} onClose={closeCreateModal} onPostCreated={() => {}} />
      </div>
    </LoadScript>
  );
};

export default MainLayout;