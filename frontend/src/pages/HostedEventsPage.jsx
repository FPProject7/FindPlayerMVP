import React, { useState } from 'react';

// Modal for participants
function ParticipantsModal({ open, onClose, participants }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-md mx-auto rounded-2xl shadow-2xl p-4 relative max-h-[80vh] flex flex-col">
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

// Add LocationIcon SVG (copied from EventsPage)
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

const mockEvents = [
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

const HostedEventsPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // For now, all events are upcoming. You can split by date if needed.
  const events = mockEvents;

  return (
    <div className="max-w-md mx-auto p-4 bg-white min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4">My Events</h1>
      <div className="flex gap-6 border-b mb-4">
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition-colors duration-200 ${activeTab === 'upcoming' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`pb-2 font-semibold text-lg border-b-2 transition-colors duration-200 ${activeTab === 'past' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>
      <div className="flex flex-col gap-6">
        {events.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No events yet.</div>
        ) : (
          events.map(event => (
            <div key={event.id} className="bg-white rounded-2xl shadow border border-gray-100 p-4">
              <div className="relative mb-3">
                <img src={event.image} alt={event.title} className="w-full h-32 object-cover rounded-xl" />
                {event.isLive && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Live</span>
                )}
              </div>
              <div className="font-bold text-lg mb-1">{event.title}</div>
              <div className="flex items-center text-gray-500 text-sm mb-1">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {event.date}
              </div>
              <div className="flex items-center text-gray-500 text-sm mb-1">
                <LocationIcon className="w-5 h-5 mr-1" size={20} />
                {event.location}
              </div>
              <div className="text-gray-700 text-sm mb-3">{event.registered} / {event.maxPlayers} Registered</div>
              <button
                className="border border-gray-300 rounded-lg px-4 py-2 font-semibold text-gray-800 hover:bg-gray-100 transition"
                onClick={() => { setSelectedParticipants(event.participants); setModalOpen(true); }}
              >
                View Players
              </button>
            </div>
          ))
        )}
      </div>
      <ParticipantsModal open={modalOpen} onClose={() => setModalOpen(false)} participants={selectedParticipants} />
    </div>
  );
};

export default HostedEventsPage; 