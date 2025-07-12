// frontend/src/components/layout/BottomNavBar.jsx

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
    IoHomeOutline, IoHome, 
    IoPodiumOutline, IoPodium, 
    IoCalendarOutline, IoCalendar,
    IoSearchOutline, IoSearch
} from 'react-icons/io5'; 
import { LiaClipboardCheckSolid, LiaClipboardSolid } from "react-icons/lia";
import { FaPlus } from 'react-icons/fa';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCreatePostStore } from '../../stores/useCreatePostStore';
import LoginPromptModal from '../common/LoginPromptModal';

import navBackground from '../../assets/nav-bg-responsive.svg';
import scoutDashboardIcon from '../../assets/scout-dashboard-icon.png';

const BottomNavBar = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { openCreateModal } = useCreatePostStore();
    const userRole = isAuthenticated && user ? user.role : null; 
    const navigate = useNavigate();
    const [showLoginModal, setShowLoginModal] = useState(false);

    const navContainerStyle = {
        backgroundImage: `url(${navBackground})`,
    };

    const navItems = [
        { to: "/", icon: <IoHomeOutline size={28} />, activeIcon: <IoHome size={28} />, label: 'Home' },
        
        userRole?.toLowerCase() === 'scout' ? 
            { to: "/scout-dashboard", icon: <img src={scoutDashboardIcon} alt="Scout Dashboard" width={34} height={34} style={{ display: 'block', filter: 'brightness(0) saturate(100%) invert(41%) sepia(6%) saturate(0%) hue-rotate(169deg) brightness(92%) contrast(86%)' }} />, activeIcon: <img src={scoutDashboardIcon} alt="Scout Dashboard" width={34} height={34} style={{ display: 'block', filter: 'invert(17%) sepia(97%) saturate(7492%) hue-rotate(359deg) brightness(70%) contrast(120%)' }} />, label: 'Dashboard' } : 
            { to: "/challenges", icon: <LiaClipboardCheckSolid size={30} />, activeIcon: <LiaClipboardSolid size={30} />, label: 'Challenges', isChallenge: true },
        
        { icon: <FaPlus size={24} />, label: 'Add', isCenter: true, isCreatePost: true },

        { to: "/leaderboard", icon: <IoPodiumOutline size={28} />, activeIcon: <IoPodium size={28} />, label: 'Leaderboard' },

        { to: "/events", icon: <IoCalendarOutline size={28} />, activeIcon: <IoCalendar size={28} />, label: 'Events' },
    ];

    const navLinkStyle = ({ isActive }) => {
        return {
            color: isActive ? '#FF0505' : '#6b7280', // Red for active, gray for inactive
        };
    };

    return (
        <>
        <nav className="nav-container" style={navContainerStyle}>
            {navItems.map((item, index) => {
                if (item.isCenter) {
                    if (item.isCreatePost) {
                        return (
                            <button
                                key={index}
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        setShowLoginModal(true);
                                    } else {
                                        openCreateModal('post');
                                    }
                                }}
                                className="nav-center-button"
                                aria-label={item.label}
                            >
                                {item.icon}
                            </button>
                        );
                    }
                    return (
                        <NavLink key={index} to={item.to} className="nav-center-button" aria-label={item.label}>
                            {item.icon}
                        </NavLink>
                    );
                }
                if (item.isChallenge) {
                    // Always go to /challenges root, force reload if already there
                    return (
                        <button
                            key={index}
                            type="button"
                            className="nav-button"
                            style={navLinkStyle({ isActive: window.location.pathname.startsWith('/challenges') })}
                            aria-label={item.label}
                            onClick={() => {
                                if (window.location.pathname === '/challenges') {
                                    window.location.reload();
                                } else {
                                    navigate('/challenges');
                                }
                            }}
                        >
                            {window.location.pathname.startsWith('/challenges') ? item.activeIcon : item.icon}
                        </button>
                    );
                }
                return (
                    <NavLink key={index} to={item.to} className="nav-button" style={navLinkStyle} aria-label={item.label}>
                        {({ isActive }) => (
                            isActive ? item.activeIcon : item.icon
                        )}
                    </NavLink>
                );
            })}
        </nav>
        {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}
        </>
    );
};

export default BottomNavBar;