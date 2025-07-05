import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// SVG icon for user (person)
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

// SVG icon for calendar
function CalendarIcon({ className = '', size = 20 }) {
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
      <rect x="3" y="4" width="18" height="18" rx="4" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// SVG icon for dollar
function DollarIcon({ className = '', size = 20 }) {
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
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// SVG icon for dress code (t-shirt)
function TshirtIcon({ className = '', size = 20 }) {
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
      <path d="M4 4l4-2 4 2 4-2 4 2v2l-2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8L4 6V4z" />
    </svg>
  );
}

const mockEvent = {
  id: 1,
  title: 'Kuwait City (Football Volta)',
  image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  host: 'Faisal Ahmad',
  sport: 'Football',
  type: 'Volta',
  location: 'Kuwait City',
  date: 'Saturday, Sep 19, 6:00 PM',
  registered: 58,
  maxPlayers: 80,
  price: 10,
  priceType: 'player',
  paymentNote: 'cash only',
  dressCode: 'Come in sportswear',
  description: `Join our four-side  Volta football tournament!\nKnockout format. Teams of five. Rules:\nNo offsides, no sliding tackles. First team team to score three goals wins.\nNice for\nlan`,
};

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // In real app, fetch event by eventId
  const event = mockEvent;
  // Hide register button if ?hostView=1 is present
  const isHostView = new URLSearchParams(location.search).get('hostView') === '1';

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8">
      {/* Header image and back button */}
      <div className="relative w-full h-48 sm:h-64 bg-gray-200">
        <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        <button
          className="absolute top-3 left-3 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100"
          onClick={() => navigate(-1)}
        >
          <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div className="p-5">
        <div className="font-bold text-xl mb-1">{event.title}</div>
        <div className="text-gray-500 text-sm mb-2">{event.type} | {event.sport}</div>
        <div className="flex items-center text-gray-600 mb-2">
          <UserIcon className="text-black mr-2" size={18} />
          <span>Hosted by <span className="font-semibold text-gray-800">{event.host}</span></span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center text-gray-800">
            <CalendarIcon className="text-black mr-2" size={18} />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center text-gray-800">
            <LocationIcon className="text-black mr-2" size={18} />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-gray-800">
            <UserIcon className="text-black mr-2" size={18} />
            <span>{event.registered} / {event.maxPlayers} players registered</span>
          </div>
          <div className="flex items-center text-gray-800">
            <DollarIcon className="text-black mr-2" size={18} />
            <span>${event.price} per player <span className="text-gray-500">({event.paymentNote})</span></span>
          </div>
          <div className="flex items-center text-gray-800">
            <TshirtIcon className="text-black mr-2" size={18} />
            <span>{event.dressCode}</span>
          </div>
        </div>
        <div className="font-bold text-lg mb-1">Description</div>
        <div className="text-gray-700 whitespace-pre-line text-sm mb-4">{event.description}</div>
        {/* Register button placeholder */}
        {!isHostView && (
          <button className="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg mt-2 hover:bg-red-600 transition">Register</button>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage; 