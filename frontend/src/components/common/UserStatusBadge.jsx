import React from 'react';

const UserStatusBadge = ({ user, className = '' }) => {
  if (!user) return null;

  const { role, is_premium_member, is_verified } = user;

  // Determine badge type and icon
  let badgeIcon = null;

  if (is_premium_member && is_verified && role === 'scout') {
    // Gold checkmark for premium & verified scouts
    badgeIcon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`inline-block ${className}`} style={{verticalAlign: 'middle'}}>
        <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
        <path d="M8 12l2.5 2.5L16 9" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (is_premium_member && role === 'scout') {
    // Blue checkmark for premium scouts (not verified)
    badgeIcon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`inline-block ${className}`} style={{verticalAlign: 'middle'}}>
        <circle cx="12" cy="12" r="10" fill="#3B82F6" />
        <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (is_premium_member && (role === 'athlete' || role === 'coach')) {
    // Red star for premium athletes/coaches
    badgeIcon = (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0505" className={`inline-block ${className}`} style={{verticalAlign: 'middle'}}>
        <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" stroke="#CC0000" strokeWidth="1" fill="#FF0505" />
      </svg>
    );
  }

  if (!badgeIcon) return null;

  return badgeIcon;
};

export default UserStatusBadge; 