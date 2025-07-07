import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ShareButton from '../components/common/ShareButton';
import { eventsApi } from '../api/eventsApi';
import { useAuthStore } from '../stores/useAuthStore';

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



const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  
  // State for event data and loading
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  // Hide register button if ?hostView=1 is present
  const isHostView = new URLSearchParams(location.search).get('hostView') === '1';

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const eventData = await eventsApi.getEvent(eventId);
        setEvent(eventData.event);
        
        // Check if user is the host
        setIsHost(eventData.event.hostId === useAuthStore.getState().user?.id);
        
        // Check if user is registered (this would need to be implemented in the backend)
        // For now, we'll assume the backend returns this information
        setIsRegistered(eventData.event.isRegistered || false);
        
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    setRegistering(true);
    try {
      await eventsApi.registerForEvent(eventId);
      setIsRegistered(true);
      // Refresh event data to update registration count
      const eventData = await eventsApi.getEvent(eventId);
      setEvent(eventData.event);
    } catch (error) {
      console.error('Error registering for event:', error);
      alert('Failed to register for event. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    setRegistering(true);
    try {
      await eventsApi.deregisterFromEvent(eventId);
      setIsRegistered(false);
      // Refresh event data to update registration count
      const eventData = await eventsApi.getEvent(eventId);
      setEvent(eventData.event);
      navigate('/events?tab=participating');
    } catch (error) {
      console.error('Error deregistering from event:', error);
      alert('Failed to deregister from event. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8 p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-full"
            onClick={() => navigate('/events')}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8 p-8">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <button 
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-full"
            onClick={() => navigate('/events')}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8">
      {/* Header image and back button */}
      <div className="relative w-full h-48 sm:h-64 bg-gray-200">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <span className="text-gray-500 text-lg">No Image</span>
          </div>
        )}
        <button
          className="absolute top-3 left-3 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100"
          onClick={() => navigate(-1)}
        >
          <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Share button in top right */}
        <div className="absolute top-3 right-3">
          <ShareButton 
            url={`${window.location.origin}/events/${eventId}`}
            title={`Check out this event: ${event.title}`}
            className="bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100"
            iconSize={20}
          />
        </div>
      </div>
      <div className="p-5">
        <div className="font-bold text-xl mb-1">{event.title}</div>
        <div className="text-gray-500 text-sm mb-2">{event.eventType} | {event.sport}</div>
        <div className="flex items-center text-gray-600 mb-2">
          <UserIcon className="text-black mr-2" size={18} />
          <span>Hosted by <span className="font-semibold text-gray-800">{event.hostName || 'Unknown Host'}</span></span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center text-gray-800">
            <CalendarIcon className="text-black mr-2" size={18} />
            <span>{new Date(event.date + 'T' + event.time).toLocaleString()}</span>
          </div>
          <div className="flex items-center text-gray-800">
            <LocationIcon className="text-black mr-2" size={18} />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-gray-800">
            <UserIcon className="text-black mr-2" size={18} />
            <span>{event.registeredPlayers || 0} / {event.maxPlayers} players registered</span>
          </div>
          <div className="flex items-center text-gray-800">
            <DollarIcon className="text-black mr-2" size={18} />
            <span>${event.participationFee} per player</span>
          </div>
          {event.dressCode && (
            <div className="flex items-center text-gray-800">
              <TshirtIcon className="text-black mr-2" size={18} />
              <span>{event.dressCode}</span>
            </div>
          )}
        </div>
        {event.description && (
          <>
            <div className="font-bold text-lg mb-1">Description</div>
            <div className="text-gray-700 whitespace-pre-line text-sm mb-4">{event.description}</div>
          </>
        )}
        {/* Button logic */}
        {!isHostView && !isHost && (
          isRegistered ? (
            <button 
              className="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg mt-2 hover:bg-red-600 transition disabled:opacity-50"
              onClick={handleUnregister}
              disabled={registering}
            >
              {registering ? 'Deregistering...' : 'Deregister'}
            </button>
          ) : (
            <button 
              className="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg mt-2 hover:bg-red-600 transition disabled:opacity-50"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register'}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default EventDetailPage; 