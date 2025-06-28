// frontend/src/components/profile/ProfileTabs.jsx
import { useState } from 'react';
import ProfilePostsTab from './ProfilePostsTab';
import ProfileChallengesTab from './ProfileChallengesTab';
import ProfileLikesTab from './ProfileLikesTab';

const ProfileTabs = ({ profile, isOwnProfile }) => {
  const TABS = [
    { key: 'posts', label: 'Posts' },
    { key: 'challenges', label: 'Challenges' },
    ...(isOwnProfile ? [{ key: 'likes', label: 'Likes' }] : []),
  ];
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div>
      <div className="flex border-b mb-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`flex-1 py-2 font-semibold ${activeTab === tab.key ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'posts' && <ProfilePostsTab profile={profile} />}
        {activeTab === 'challenges' && <ProfileChallengesTab profile={profile} />}
        {activeTab === 'likes' && isOwnProfile && <ProfileLikesTab profile={profile} />}
      </div>
    </div>
  );
};

export default ProfileTabs;