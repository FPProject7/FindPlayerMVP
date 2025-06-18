// frontend/src/components/layout/BottomNavBar.jsx

import React from 'react';
import { IoHomeOutline, IoPodiumOutline, IoCalendarOutline } from 'react-icons/io5';
import { LiaClipboardCheckSolid } from "react-icons/lia";
import { FaPlus } from 'react-icons/fa';

const BottomNavBar = () => {
  const navItems = [
    { icon: <IoHomeOutline size={36} />, label: 'Home' },
    { icon: <LiaClipboardCheckSolid size={40} />, label: 'Challenges' },
    { icon: <FaPlus size={24} />, isCenter: true },
    { icon: <IoPodiumOutline size={36} />, label: 'Leaderboard' },
    { icon: <IoCalendarOutline size={36} />, label: 'Events' },
  ];

  return (
    <nav className="nav-container">
      {navItems.map((item, index) => {
        if (item.isCenter) {
          return (
            <button key={index} className="nav-center-button">
              {item.icon}
            </button>
          );
        }
        let buttonStyle = {};
                if (item.label === 'Challenges') {
                    // Pushes the challenges button slightly to the left
                    buttonStyle = { paddingRight: '30px' };
                }
                if (item.label === 'Leaderboard') {
                    // Pushes the leaderboard button slightly to the right
                    buttonStyle = { paddingLeft: '30px' };
                }
        return (
            <button key={index} className="nav-button" style={buttonStyle}>
              {item.icon}
            </button>
        );
      })}
    </nav>
  );
};

export default BottomNavBar;