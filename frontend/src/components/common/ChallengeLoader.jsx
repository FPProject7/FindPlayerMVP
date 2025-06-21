// frontend/src/components/common/ChallengeLoader.jsx

import React from 'react';
import './ChallengeLoader.css'; // Make sure to create this CSS file

const ChallengeLoader = () => {
  return (
    <div className="challenge-loader-container">
      <div className="challenge-loader-track">
        <div className="challenge-loader-runner"></div>
      </div>
    </div>
  );
};

export default ChallengeLoader;