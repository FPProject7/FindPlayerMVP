import React, { useState } from 'react';
import { getXPDetails } from '../../utils/levelUtils';

const XPTestComponent = ({ profile }) => {
  const [testXP, setTestXP] = useState(profile?.xpTotal || 0);
  
  const xpDetails = getXPDetails(testXP);
  
  return (
    <div className="p-4 border border-gray-300 rounded-lg mb-4 bg-gray-50">
      <h3 className="font-bold text-lg mb-2">XP System Test</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test XP Value:
        </label>
        <input
          type="number"
          value={testXP}
          onChange={(e) => setTestXP(parseInt(e.target.value) || 0)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="space-y-2">
        <div><strong>Current XP:</strong> {xpDetails.xpTotal}</div>
        <div><strong>Level:</strong> {xpDetails.level}</div>
        <div><strong>Progress:</strong> {xpDetails.progress.toFixed(1)}%</div>
        <div><strong>XP to Next Level:</strong> {xpDetails.xpNeeded}</div>
        
        <div className="mt-3">
          <div className="text-sm text-gray-600 mb-1">XP Progress Bar:</div>
          <div className="w-full h-3 bg-gray-200 rounded-full">
            <div
              className="h-3 bg-red-600 rounded-full transition-all duration-300"
              style={{ width: `${xpDetails.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <div>Profile XP: {profile?.xpTotal || 0}</div>
        <div>Profile Level: {getXPDetails(profile?.xpTotal || 0).level}</div>
      </div>
    </div>
  );
};

export default XPTestComponent; 