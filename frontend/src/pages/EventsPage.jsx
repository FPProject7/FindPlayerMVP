// frontend/src/pages/EventsPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { useAuthStore } from '../stores/useAuthStore'; // Import your authentication store
import ShareButton from '../components/common/ShareButton';

import './EventsPage.css';

const tabOptions = [
  { key: 'available', label: 'Events' },
  { key: 'my', label: 'Hosted' },
  { key: 'participating', label: 'Joined' },
];

// Mock event data
const mockEvents = [
  {
    id: 1,
    title: 'Kuwait City (Football Volta)',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    registered: 312,
    distance: '1.2 miles away',
    price: 100,
    priceType: 'Team',
    date: 'Sep 20, 2025',
    location: 'Kuwait City',
    isFavorite: false,
  },
  {
    id: 2,
    title: 'Court Clash',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
    registered: 120,
    distance: '2.5 miles away',
    price: 50,
    priceType: 'Player',
    date: 'Sep 22, 2025',
    location: 'Kuwait Arena',
    isFavorite: true,
  },
];

// SVG icon for user (person) - copied from LeaderboardPage
function UserIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

// SVG icon for location
function LocationIcon({ className = '', size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const EventCard = ({ event }) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-white rounded-xl shadow-md mb-6 overflow-hidden border border-gray-200 max-w-xl mx-auto cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="w-full h-40 bg-gray-200 relative">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        {/* Share button in top right */}
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <ShareButton 
            url={`${window.location.origin}/events/${event.id}`}
            title={`Check out this event: ${event.title}`}
            iconSize={20}
          />
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold text-lg mb-1">{event.title}</div>
        <div className="flex flex-col text-gray-500 text-sm mb-2">
          {/* Participants icon and count */}
          <span className="flex items-center mb-1">
            <UserIcon className="text-black mr-1" size={18} />
            <span className="font-semibold text-gray-700">{event.registered}</span>
            <span className="ml-1">Participants</span>
          </span>
          {/* Show location under participants */}
          <span className="flex items-center">
            <LocationIcon className="text-black mr-1" size={18} />
            {event.location}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          {/* Always show fee per player */}
          <div className="text-xl font-bold text-gray-900">${event.price} <span className="text-sm font-normal text-gray-500">/player</span></div>
          <button className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-600 text-sm">Register now</button>
        </div>
      </div>
    </div>
  );
};

// --- Hosted Events Mock Data and Modal (from HostedEventsPage) ---
function ParticipantsModal({ open, onClose, participants }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-xs mx-auto rounded-2xl shadow-2xl p-4 relative max-h-[80vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Participants</h2>
        {participants.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No participants yet.</div>
        ) : (
          <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: '60vh' }}>
            {participants.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 py-3 px-2 rounded"
              >
                {user.profilePictureUrl ? (
                  <img
                    className="w-10 h-10 rounded-full object-cover mr-4"
                    src={user.profilePictureUrl}
                    alt={user.name}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-4">
                    <span>{(user.name || 'U').charAt(0)}</span>
                  </div>
                )}
                <span className="font-semibold text-gray-800">{user.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const hostedMockEvents = [
  {
    id: 1,
    title: 'Kuwait City (Football Volta)',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    date: 'Sep 20, 2025 5:00 PM',
    location: 'Kuwait City',
    registered: 15,
    maxPlayers: 20,
    isLive: true,
    participants: [
      { id: 1, name: 'Faisal Ahmad', profilePictureUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
      { id: 2, name: 'Ali Yousef', profilePictureUrl: 'https://randomuser.me/api/portraits/men/2.jpg' },
      { id: 3, name: 'Sara Khaled', profilePictureUrl: 'https://randomuser.me/api/portraits/women/3.jpg' },
    ],
  },
  {
    id: 2,
    title: 'Streetball Tournament',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
    date: 'Aug 15, 2025 2:00 PM',
    location: 'Kuwait Arena',
    registered: 8,
    maxPlayers: 12,
    isLive: true,
    participants: [
      { id: 4, name: 'Mohammed Al Sabah', profilePictureUrl: 'https://randomuser.me/api/portraits/men/4.jpg' },
      { id: 5, name: 'Fatima Noor', profilePictureUrl: 'https://randomuser.me/api/portraits/women/5.jpg' },
    ],
  },
  {
    id: 3,
    title: 'U18 Scouting Combine',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    date: 'Jul 5, 2025 9:00 AM',
    location: 'Kuwait City',
    registered: 50,
    maxPlayers: 50,
    isLive: true,
    participants: [
      { id: 6, name: 'Yousef Al Rashid', profilePictureUrl: 'https://randomuser.me/api/portraits/men/6.jpg' },
      { id: 7, name: 'Mona Al Sabah', profilePictureUrl: 'https://randomuser.me/api/portraits/women/7.jpg' },
    ],
  },
];

// Mock data for joined/participating events
const joinedMockEvents = [
  {
    id: 4,
    title: 'Weekend Football League',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80',
    date: 'Sep 25, 2025 4:00 PM',
    location: 'Kuwait Sports Club',
    registered: 22,
    maxPlayers: 24,
    price: 15,
    priceType: 'player',
    paymentNote: 'cash only',
    dressCode: 'Red team jersey required',
    description: 'Weekly football league for intermediate players. Teams will be formed on the day. Bring your own cleats and water.',
    host: 'Ahmed Al Mansouri',
    sport: 'Football',
    type: 'League',
  },
  {
    id: 5,
    title: 'Basketball Pickup Games',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80',
    date: 'Sep 28, 2025 6:00 PM',
    location: 'Al Shaab Indoor Court',
    registered: 18,
    maxPlayers: 20,
    price: 8,
    priceType: 'player',
    paymentNote: 'cash only',
    dressCode: 'Basketball shoes required',
    description: 'Casual pickup basketball games. All skill levels welcome. Games will be 4v4 or 5v5 depending on turnout.',
    host: 'Sarah Johnson',
    sport: 'Basketball',
    type: 'Pickup',
  },
  {
    id: 6,
    title: 'Youth Training Camp',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    date: 'Oct 2, 2025 9:00 AM',
    location: 'Kuwait National Stadium',
    registered: 35,
    maxPlayers: 40,
    price: 25,
    priceType: 'player',
    paymentNote: 'online payment',
    dressCode: 'Training gear provided',
    description: 'Professional training camp for young athletes aged 16-21. Focus on technique, fitness, and game strategy.',
    host: 'Coach Mohammed',
    sport: 'Football',
    type: 'Training',
  },
];

const EventsPage = () => {
  const { isAuthenticated } = useAuthStore(); // Get the authentication status
  const navigate = useNavigate(); // Initialize navigate hook
  const [activeTab, setActiveTab] = useState('available');
  // Hosted tab modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  const handleSignInClick = () => {
    navigate('/login'); // Redirect to the login page
  };

  return (
    <div className="events-page-container">
      {/* Sign In Button (conditionally rendered) */}
      {!isAuthenticated && (
        <button
          className="sign-in-button"
          onClick={handleSignInClick}
        >
          Sign In
        </button>
      )}

      {/* Tab Header */}
      <div className="flex justify-center gap-2 my-6">
        {tabOptions.map(tab => (
          <button
            key={tab.key}
            className={`flex-1 min-w-0 max-w-[160px] py-2 rounded-full border-2 font-bold text-sm uppercase transition-colors duration-200
              ${activeTab === tab.key
                ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                : 'bg-white text-red-600 border-red-500 hover:bg-red-100'}`}
            style={{ flexGrow: 1 }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'available' && (
          <div>
            {/* Map Placeholder */}
            <div className="w-full h-56 bg-gray-200 rounded-xl mb-6 flex items-center justify-center relative max-w-xl mx-auto">
              <span className="text-gray-400 text-lg">[Map Placeholder]</span>
              {/* Show price bubbles for each event */}
              {mockEvents.map((event, idx) => (
                <div
                  key={event.id}
                  className="absolute bg-white rounded-full px-3 py-1 shadow text-sm font-bold text-gray-700 border border-gray-300 cursor-pointer hover:bg-red-100 transition"
                  style={{
                    left: `${30 + idx * 30}%`,
                    top: `${30 + idx * 20}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2,
                  }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  ${event.price}
                </div>
              ))}
            </div>
            {/* Event List */}
            <div>
              {mockEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
        {activeTab === 'my' && (
          <div className="flex flex-col gap-6">
            {hostedMockEvents.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No events yet.</div>
            ) : (
              hostedMockEvents.map(event => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/events/${event.id}?hostView=1`)}
                >
                  <div className="relative mb-3">
                    <img src={event.image} alt={event.title} className="w-full h-32 object-cover rounded-xl" />
                    {/* Share button in top right */}
                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <ShareButton 
                        url={`${window.location.origin}/events/${event.id}`}
                        title={`Check out this event: ${event.title}`}
                        iconSize={18}
                      />
                    </div>
                  </div>
                  <div className="font-bold text-lg mb-1">{event.title}</div>
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {event.date} <span className="mx-2">{event.location}</span>
                  </div>
                  <div className="text-gray-700 text-sm mb-3">{event.registered} / {event.maxPlayers} Registered</div>
                  <button
                    className="border border-gray-300 rounded-lg px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 transition"
                    onClick={e => { e.stopPropagation(); setSelectedParticipants(event.participants); setModalOpen(true); }}
                  >
                    View Players
                  </button>
                </div>
              ))
            )}
            <ParticipantsModal open={modalOpen} onClose={() => setModalOpen(false)} participants={selectedParticipants} />
          </div>
        )}
        {activeTab === 'participating' && (
          <div className="flex flex-col gap-6">
            {joinedMockEvents.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No joined events yet.</div>
            ) : (
              joinedMockEvents.map(event => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow border border-gray-100 p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="relative mb-3">
                    <img src={event.image} alt={event.title} className="w-full h-32 object-cover rounded-xl" />
                    {/* Share button in top right */}
                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <ShareButton 
                        url={`${window.location.origin}/events/${event.id}`}
                        title={`Check out this event: ${event.title}`}
                        iconSize={18}
                      />
                    </div>
                  </div>
                  <div className="font-bold text-lg mb-1">{event.title}</div>
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {event.date} <span className="mx-2">{event.location}</span>
                  </div>
                  <div className="text-gray-700 text-sm mb-3">{event.registered} / {event.maxPlayers} Registered</div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-gray-900">${event.price} <span className="text-sm font-normal text-gray-500">/player</span></div>
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-600 text-sm transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement deregister functionality
                        console.log('Deregister from event:', event.id);
                      }}
                    >
                      Deregister
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;