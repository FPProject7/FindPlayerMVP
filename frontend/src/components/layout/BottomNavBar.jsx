// frontend/src/components/layout/BottomNavBar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom'; // 1. Import NavLink instead of Link
import { IoHomeOutline, IoHome, IoPodiumOutline, IoPodium, IoCalendarOutline, IoCalendar } from 'react-icons/io5';
import { LiaClipboardCheckSolid, LiaClipboardSolid } from "react-icons/lia";
import { FaPlus } from 'react-icons/fa';

// Import the SVG file
import navBackground from '../../assets/nav-bg-responsive.svg';

const BottomNavBar = () => {
    const navContainerStyle = {
        backgroundImage: `url(${navBackground})`,
    };

    // We now include the destination path for each link
    // And provide both an active and inactive icon
    const navItems = [
        { to: "/", icon: <IoHomeOutline size={28} />, activeIcon: <IoHome size={28} />, label: 'Home' },
        { to: "/challenges", icon: <LiaClipboardCheckSolid size={30} />, activeIcon: <LiaClipboardSolid size={30} />, label: 'Challenges' },
        { to: "/upload", icon: <FaPlus size={24} />, label: 'Add', isCenter: true },
        { to: "/leaderboard", icon: <IoPodiumOutline size={28} />, activeIcon: <IoPodium size={28} />, label: 'Leaderboard' },
        { to: "/events", icon: <IoCalendarOutline size={28} />, activeIcon: <IoCalendar size={28} />, label: 'Events' },
    ];

    const navLinkStyle = ({ isActive }) => {
        // This function returns a style object. If the NavLink is active, it sets the color to red.
        return {
            color: isActive ? '#dc2626' : '#6b7280', // Red for active, gray for inactive
        };
    };

    return (
        <nav className="nav-container" style={navContainerStyle}>
            {navItems.map((item, index) => {
                if (item.isCenter) {
                    // The center button can be a regular Link or NavLink as well
                    return (
                        <NavLink key={index} to={item.to} className="nav-center-button" aria-label={item.label}>
                            {item.icon}
                        </NavLink>
                    );
                }
                return (
                    <NavLink key={index} to={item.to} className="nav-button" style={navLinkStyle} aria-label={item.label}>
                        {({ isActive }) => (
                            // We now show a different icon based on whether the link is active
                            isActive ? item.activeIcon : item.icon
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
};

export default BottomNavBar;