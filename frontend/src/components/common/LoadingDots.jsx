// frontend/src/components/common/LoadingDots.jsx

import React from 'react';
import './LoadingDots.css';

const LoadingDots = () => {
  return (
    <span className="loading-dots-container">
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
    </span>
  );
};

export default LoadingDots;