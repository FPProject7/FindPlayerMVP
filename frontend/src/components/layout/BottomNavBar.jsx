// frontend/src/components/layout/BottomNavBar.jsx

import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    IoHomeOutline, IoHome, 
    IoPodiumOutline, IoPodium, 
    IoCalendarOutline, IoCalendar,
    IoSearchOutline, IoSearch // <--- CHANGED: Magnifying glass icons for Scout Dashboard
} from 'react-icons/io5'; 
import { LiaClipboardCheckSolid, LiaClipboardSolid } from "react-icons/lia";
import { FaPlus } from 'react-icons/fa';
import { useAuthStore } from '../../stores/useAuthStore';

import navBackground from '../../assets/nav-bg-responsive.svg';

const BottomNavBar = () => {
    const { user, isAuthenticated } = useAuthStore();
    const userRole = isAuthenticated && user ? user.role : null; 

    const navContainerStyle = {
        backgroundImage: `url(${navBackground})`,
    };

    const navItems = [
        { to: "/", icon: <IoHomeOutline size={28} />, activeIcon: <IoHome size={28} />, label: 'Home' },
        
        userRole?.toLowerCase() === 'scout' ? 
            // CHANGED: Use magnifying glass icons here
            { to: "/scout-dashboard", icon: <IoSearchOutline size={28} />, activeIcon: <IoSearch size={28} />, label: 'Dashboard' } : 
            { to: "/challenges", icon: <LiaClipboardCheckSolid size={30} />, activeIcon: <LiaClipboardSolid size={30} />, label: 'Challenges' },
        
        { to: "/upload", icon: <FaPlus size={24} />, label: 'Add', isCenter: true },

        { to: "/leaderboard", icon: <IoPodiumOutline size={28} />, activeIcon: <IoPodium size={28} />, label: 'Leaderboard' },

        { to: "/events", icon: <IoCalendarOutline size={28} />, activeIcon: <IoCalendar size={28} />, label: 'Events' },
    ];


    const navLinkStyle = ({ isActive }) => {
        return {
            color: isActive ? '#dc2626' : '#6b7280', // Red for active, gray for inactive
        };
    };

    return (
        <nav className="nav-container" style={navContainerStyle}>
            {navItems.map((item, index) => {
                if (item.isCenter) {
                    return (
                        <NavLink key={index} to={item.to} className="nav-center-button" aria-label={item.label}>
                            {item.icon}
                        </NavLink>
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
    );
};

export default BottomNavBar;