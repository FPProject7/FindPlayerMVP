// frontend/src/components/profile/ProfileTabs.jsx
import { useState } from 'react';
import ProfilePostsTab from './ProfilePostsTab';
import ProfileChallengesTab from './ProfileChallengesTab';
import ProfileLikesTab from './ProfileLikesTab';

const ProfileTabs = ({ profile, isOwnProfile }) => {
  const userRole = profile?.role?.toLowerCase();
  
  const TABS = [
    { key: 'posts', label: 'Posts' },
    // Only show challenges tab if user is not a scout
    ...(userRole !== 'scout' ? [{ key: 'challenges', label: 'Challenges' }] : []),
    ...(isOwnProfile ? [{ key: 'likes', label: 'Likes' }] : []),
  ];
  const [activeTab, setActiveTab] = useState('posts');

  // If the active tab is challenges but challenges tab is not available, default to posts
  const effectiveActiveTab = TABS.find(tab => tab.key === activeTab) ? activeTab : 'posts';

  return (
    <div>
      <div className="flex border-b mb-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`flex-1 py-2 font-semibold ${effectiveActiveTab === tab.key ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {effectiveActiveTab === 'posts' && <ProfilePostsTab profile={profile} />}
        {effectiveActiveTab === 'challenges' && <ProfileChallengesTab profile={profile} />}
        {effectiveActiveTab === 'likes' && isOwnProfile && <ProfileLikesTab profile={profile} />}
      </div>
    </div>
  );
};

export default ProfileTabs;