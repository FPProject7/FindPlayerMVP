// frontend/src/pages/EventsPage.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { useAuthStore } from '../stores/useAuthStore'; // Import your authentication store
import ShareButton from '../components/common/ShareButton';
import ChallengeLoader from '../components/common/ChallengeLoader';
import LoginPromptModal from '../components/common/LoginPromptModal';
import { FiSearch, FiMapPin } from 'react-icons/fi';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { eventsApi } from '../api/eventsApi';
import { getUserInfo } from '../api/userApi';
import { PUBLIC_BASE_URL } from '../config';

import './EventsPage.css';

const tabOptions = [
  { key: 'available', label: 'Events' },
  { key: 'my', label: 'Hosted' },
  { key: 'participating', label: 'Joined' },
];

// Default map center (Beirut, Lebanon)
const defaultCenter = { lat: 33.8935, lng: 35.5018 };
const defaultZoom = 10;

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
  const { isAuthenticated } = useAuthStore();
  const [hostInfo, setHostInfo] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Fetch host info when component mounts
  useEffect(() => {
    const fetchHostInfo = async () => {
      if (event.hostUserId) {
        try {
          const hostData = await getUserInfo(event.hostUserId);
          setHostInfo(hostData);
        } catch (error) {
          console.error('Error fetching host info:', error);
          setHostInfo({
            id: event.hostUserId,
            name: `User ${event.hostUserId.slice(0, 6)}`,
            profilePictureUrl: null
          });
        }
      }
    };
    
    fetchHostInfo();
  }, [event.hostUserId]);

  // Helper function to format date and time
  const formatDateTime = (date, time) => {
    if (!date) return 'Date not set';
    
    try {
      if (time) {
        // If we have both date and time, create a full datetime
        const dateTime = new Date(`${date}T${time}`);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // If no time or invalid datetime, just show the date
      const dateOnly = new Date(date);
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not set';
    }
  };

  const handleRegisterClick = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      navigate(`/events/${event.eventId}`);
    }
  };

  const fee =
    event.participationFee !== undefined &&
    event.participationFee !== null &&
    event.participationFee !== '' &&
    !isNaN(Number(event.participationFee)) &&
    Number(event.participationFee) > 0
      ? `$${Number(event.participationFee)}`
      : 'Free';
  return (
    <>
      <div
        className="bg-white rounded-xl shadow-md mb-6 overflow-hidden border border-gray-200 max-w-xl mx-auto cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate(`/events/${event.eventId}`)}
      >
        <div className="w-full h-40 bg-gray-200 relative">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          {/* Share button in top right */}
          <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
            <ShareButton 
              url={`${PUBLIC_BASE_URL}/events/${event.eventId}`}
              title={`Check out this event: ${event.title}`}
              iconSize={20}
            />
          </div>
        </div>
        <div className="p-4">
          <div className="font-semibold text-lg mb-1">{event.title}</div>
          <div className="flex flex-col text-gray-500 text-sm mb-2">
            {/* Host name */}
            <span className="flex items-center mb-1">
              <UserIcon className="text-black mr-1" size={18} />
              <span className="font-semibold text-gray-700">{hostInfo?.name || `User ${event.hostUserId?.slice(0, 6) || 'Unknown'}`}</span>
            </span>
            {/* Date and time */}
            <span className="flex items-center mb-1">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="4"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatDateTime(event.date, event.time)}
            </span>
            {/* Show location under date/time */}
            <span className="flex items-center">
              <LocationIcon className="text-black mr-1" size={18} />
              {event.location}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            {/* Always show fee per player */}
            <div className="text-xl font-bold text-gray-900">{fee} <span className="text-sm font-normal text-gray-500">/player</span></div>
            <button 
              className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-600 text-sm"
              onClick={handleRegisterClick}
            >
              Register now
            </button>
          </div>
        </div>
      </div>
      {showLoginModal && (
        <LoginPromptModal onClose={() => setShowLoginModal(false)} />
      )}
    </>
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

// Hosted Event Card Component
const HostedEventCard = ({ event }) => {
  const navigate = useNavigate();
  const [hostInfo, setHostInfo] = useState(null);
  
  // Fetch host info when component mounts
  useEffect(() => {
    const fetchHostInfo = async () => {
      if (event.hostUserId) {
        try {
          const hostData = await getUserInfo(event.hostUserId);
          setHostInfo(hostData);
        } catch (error) {
          console.error('Error fetching host info:', error);
          setHostInfo({
            id: event.hostUserId,
            name: `User ${event.hostUserId.slice(0, 6)}`,
            profilePictureUrl: null
          });
        }
      }
    };
    
    fetchHostInfo();
  }, [event.hostUserId]);

  // Helper function to format date and time
  const formatDateTime = (date, time) => {
    if (!date) return 'Date not set';
    
    try {
      if (time) {
        // If we have both date and time, create a full datetime
        const dateTime = new Date(`${date}T${time}`);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // If no time or invalid datetime, just show the date
      const dateOnly = new Date(date);
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not set';
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow border border-gray-100 p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/events/${event.eventId}?hostView=1`)}
    >
      <div className="relative mb-3">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-32 object-cover rounded-xl" />
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-gray-300 rounded-xl">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
        {/* Share button in top right */}
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <ShareButton 
            url={`${PUBLIC_BASE_URL}/events/${event.eventId}`}
            title={`Check out this event: ${event.title}`}
            iconSize={18}
          />
        </div>
      </div>
      <div className="font-bold text-lg mb-1">{event.title}</div>
      <div className="flex items-center text-gray-500 text-sm mb-1">
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {formatDateTime(event.date, event.time)} <span className="mx-2">{event.location}</span>
      </div>
      <div className="text-gray-700 text-sm mb-3">{(event.currentParticipantCount !== undefined ? event.currentParticipantCount : (event.registeredPlayers || 0))} / {event.maxParticipants || event.maxPlayers} Registered</div>
      {/* Removed View Players button */}
    </div>
  );
};

// Participating Event Card Component
const ParticipatingEventCard = ({ event, onDeregister }) => {
  const navigate = useNavigate();
  const [hostInfo, setHostInfo] = useState(null);
  
  // Fetch host info when component mounts
  useEffect(() => {
    const fetchHostInfo = async () => {
      if (event.hostUserId) {
        try {
          const hostData = await getUserInfo(event.hostUserId);
          setHostInfo(hostData);
        } catch (error) {
          console.error('Error fetching host info:', error);
          setHostInfo({
            id: event.hostUserId,
            name: `User ${event.hostUserId.slice(0, 6)}`,
            profilePictureUrl: null
          });
        }
      }
    };
    
    fetchHostInfo();
  }, [event.hostUserId]);

  // Helper function to format date and time
  const formatDateTime = (date, time) => {
    if (!date) return 'Date not set';
    
    try {
      if (time) {
        // If we have both date and time, create a full datetime
        const dateTime = new Date(`${date}T${time}`);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      // If no time or invalid datetime, just show the date
      const dateOnly = new Date(date);
      if (!isNaN(dateOnly.getTime())) {
        return dateOnly.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not set';
    }
  };

  const fee =
    event.participationFee !== undefined &&
    event.participationFee !== null &&
    event.participationFee !== '' &&
    !isNaN(Number(event.participationFee)) &&
    Number(event.participationFee) > 0
      ? `$${Number(event.participationFee)}`
      : 'Free';

  return (
    <div
      className="bg-white rounded-2xl shadow border border-gray-100 p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      <div className="relative mb-3">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-32 object-cover rounded-xl" />
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-gray-300 rounded-xl">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
        {/* Share button in top right */}
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <ShareButton 
            url={`${PUBLIC_BASE_URL}/events/${event.id}`}
            title={`Check out this event: ${event.title}`}
            iconSize={18}
          />
        </div>
      </div>
      <div className="font-bold text-lg mb-1">{event.title}</div>
      <div className="flex items-center text-gray-500 text-sm mb-1">
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {formatDateTime(event.date, event.time)} <span className="mx-2">{event.location}</span>
      </div>
      <div className="text-gray-700 text-sm mb-3">{(event.currentParticipantCount !== undefined ? event.currentParticipantCount : (event.registeredPlayers || 0))} / {event.maxParticipants || event.maxPlayers} Registered</div>
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-gray-900">{fee} <span className="text-sm font-normal text-gray-500">/player</span></div>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-600 text-sm transition"
          onClick={(e) => {
            e.stopPropagation();
            onDeregister(event.id);
          }}
        >
          Deregister
        </button>
      </div>
    </div>
  );
};

const mapContainerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: '16px',
  marginBottom: '1.5rem',
};

const mapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const GOOGLE_MAPS_LIBRARIES = ['places'];

function LocationSearchBar({ onSelect, isLoaded }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ 
    debounce: 300,
    enabled: isLoaded // Only enable when Google Maps is loaded
  });

  return (
    <div className="search-container" style={{ position: 'relative' }}>
      <FiSearch className="search-icon" size={20} />
      <input
        className="search-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={!ready || !isLoaded}
        placeholder={isLoaded ? "Search for a location..." : "Loading map..."}
        autoComplete="off"
      />
      {status === 'OK' && (
        <ul className="autocomplete-dropdown">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={async () => {
                setValue(description, false);
                clearSuggestions();
                const results = await getGeocode({ address: description });
                const { lat, lng } = await getLatLng(results[0]);
                // viewport may be present for any place
                let viewport = results[0]?.geometry?.viewport;
                let bounds = null;
                if (viewport && typeof viewport.getNorthEast === 'function' && typeof viewport.getSouthWest === 'function') {
                  bounds = {
                    north: viewport.getNorthEast().lat(),
                    east: viewport.getNorthEast().lng(),
                    south: viewport.getSouthWest().lat(),
                    west: viewport.getSouthWest().lng(),
                  };
                }
                onSelect({ lat, lng, description, viewport: bounds });
              }}
              className="autocomplete-item"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Helper to generate a custom SVG bubble for the marker
function getBubbleSVG(participationFee) {
  let text = 'Free';
  if (
    participationFee !== undefined &&
    participationFee !== null &&
    participationFee !== '' &&
    !isNaN(Number(participationFee)) &&
    Number(participationFee) > 0
  ) {
    text = `$${Number(participationFee)}`;
  }
  const width = 60;
  const height = 36;
  return {
    url: `data:image/svg+xml;utf8,<svg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg'><rect x='2' y='2' rx='18' ry='18' width='${width-4}' height='${height-4}' fill='%23ef4444' stroke='%23ef4444' stroke-width='3'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Inter,sans-serif' font-size='18' font-weight='500' fill='white'>${text}</text></svg>` ,
    scaledSize: { width, height },
    anchor: { x: width / 2, y: height / 2 },
  };
}

// Helper to check if event is in the future
function isFutureEvent(event) {
  if (!event.date) return true; // If no date, show by default
  const eventDateTime = new Date(event.date + 'T' + (event.time || '00:00'));
  return eventDateTime >= new Date();
}

const EventsPage = () => {
  const { isAuthenticated } = useAuthStore(); // Get the authentication status
  const navigate = useNavigate(); // Initialize navigate hook
  const [activeTab, setActiveTab] = useState('available');
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Hosted tab modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  
  // API data state
  const [events, setEvents] = useState([]);
  const [hostedEvents, setHostedEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search and map state
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [mapBounds, setMapBounds] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);

  // Google Maps API
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapRef = useRef();

  // Clean up mapRef on unmount
  useEffect(() => {
    return () => {
      mapRef.current = null;
    };
  }, []);

  // Handle tab changes with authentication check
  const handleTabChange = (tabKey) => {
    if ((tabKey === 'my' || tabKey === 'participating') && !isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setActiveTab(tabKey);
  };

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      // Allow fetching available events for all users (public)
      if (activeTab === 'available') {
        setLoading(true);
        setError('');
        
        try {
          const eventsData = await eventsApi.getEvents();
          setEvents((eventsData.events || []).map(e => ({ ...e, id: e.eventId, eventId: e.eventId })));
        } catch (err) {
          console.error('Error fetching events:', err);
          setError('Failed to load events. Please try again.');
        } finally {
          setLoading(false);
        }
        return;
      }
      
      // Require authentication for hosted and participating tabs
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError('');
      
      try {
        switch (activeTab) {
          case 'my':
            const hostedData = await eventsApi.getMyHostedEvents();
            setHostedEvents((hostedData.events || []).map(e => ({ ...e, id: e.eventId, eventId: e.eventId })));
            break;
          case 'participating':
            const registeredData = await eventsApi.getMyRegisteredEvents();
            const registrations = registeredData.events || [];
            // Fetch full event details for each registration in parallel
            const eventDetailPromises = registrations.map(async (reg) => {
              const eventId = reg.eventId || reg.id;
              try {
                const event = await eventsApi.getEvent(eventId);
                return { ...event, id: event.id || event.eventId, eventId: event.eventId };
              } catch (e) {
                // If event not found (404), return null
                console.error(`Event ${eventId} not found:`, e);
                return null;
              }
            });
            
            // Wait for all event detail requests to complete in parallel
            const eventDetails = await Promise.all(eventDetailPromises);
            
            // Remove nulls (404s) and duplicates based on id
            const uniqueEvents = eventDetails.filter(event => event && event.id)
              .filter((event, index, self) =>
                index === self.findIndex(e => e.id === event.id)
              );
            setRegisteredEvents(uniqueEvents);
            break;
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isAuthenticated]);

  // Filter events based on search query and date
  useEffect(() => {
    const currentEvents = activeTab === 'available' ? events : 
                       activeTab === 'my' ? hostedEvents : 
                       registeredEvents;
    // Only show future events
    const futureEvents = currentEvents.filter(isFutureEvent);
    if (!searchQuery.trim()) {
      setFilteredEvents(futureEvents);
    } else {
      const filtered = futureEvents.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.sport?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, activeTab, events, hostedEvents, registeredEvents]);

  // Update visible events when map bounds change
  useEffect(() => {
    if (!mapBounds) {
      setVisibleEvents(filteredEvents);
      return;
    }
    setVisibleEvents(
      filteredEvents.filter(event => {
        if (!event.coordinates) return false;
        const { lat, lng } = event.coordinates;
        return (
          lat >= mapBounds.south &&
          lat <= mapBounds.north &&
          lng >= mapBounds.west &&
          lng <= mapBounds.east
        );
      })
    );
  }, [filteredEvents, mapBounds]);

  const handleSignInClick = () => {
    navigate('/login'); // Redirect to the login page
  };

  return (
    <div className="events-page-container">
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
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-4">
        {loading && (
          <div className="text-center py-8">
            <ChallengeLoader />
          </div>
        )}
        
        {!loading && activeTab === 'available' && (
          <div>
            {/* Only render map and search bar after Google Maps is loaded */}
            {!isLoaded ? (
              <div className="text-center py-8">
                <ChallengeLoader />
              </div>
            ) : (
              <>
                {/* Location Autocomplete Search Bar */}
                <LocationSearchBar
                  onSelect={({ lat, lng, viewport }) => {
                    if (viewport && mapRef.current) {
                      // Fit map to place bounds
                      const bounds = new window.google.maps.LatLngBounds(
                        { lat: viewport.south, lng: viewport.west },
                        { lat: viewport.north, lng: viewport.east }
                      );
                      if (mapRef.current && typeof mapRef.current.fitBounds === 'function') {
                        mapRef.current.fitBounds(bounds);
                      }
                    } else {
                      setMapCenter({ lat, lng });
                      setMapZoom(13);
                    }
                  }}
                  isLoaded={isLoaded}
                />
                {/* Map Toggle */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="event-count">
                    {visibleEvents.length} {visibleEvents.length === 1 ? 'Event' : 'Events'} Found
                  </h2>
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="map-toggle"
                  >
                    <FiMapPin size={18} />
                    {showMap ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>
                {/* Google Map */}
                {showMap && (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={mapZoom}
                    onLoad={map => { if (map) mapRef.current = map; }}
                    onUnmount={() => { mapRef.current = null; }}
                    onBoundsChanged={() => {
                      if (!mapRef.current) return;
                      const bounds = mapRef.current.getBounds && mapRef.current.getBounds();
                      if (!bounds) return;
                      setMapBounds({
                        north: bounds.getNorthEast().lat(),
                        east: bounds.getNorthEast().lng(),
                        south: bounds.getSouthWest().lat(),
                        west: bounds.getSouthWest().lng(),
                      });
                    }}
                    onDragEnd={e => {
                      if (!mapRef.current) return;
                      const bounds = mapRef.current.getBounds && mapRef.current.getBounds();
                      if (!bounds) return;
                      setMapBounds({
                        north: bounds.getNorthEast().lat(),
                        east: bounds.getNorthEast().lng(),
                        south: bounds.getSouthWest().lat(),
                        west: bounds.getSouthWest().lng(),
                      });
                    }}
                    onZoomChanged={e => {
                      if (!mapRef.current) return;
                      const bounds = mapRef.current.getBounds && mapRef.current.getBounds();
                      if (!bounds) return;
                      setMapBounds({
                        north: bounds.getNorthEast().lat(),
                        east: bounds.getNorthEast().lng(),
                        south: bounds.getSouthWest().lat(),
                        west: bounds.getSouthWest().lng(),
                      });
                    }}
                    options={mapOptions}
                  >
                    {filteredEvents.map(event =>
                      event.coordinates ? (
                        <Marker
                          key={event.id}
                          position={event.coordinates}
                          onClick={() => navigate(`/events/${event.eventId}`)}
                          icon={getBubbleSVG(event.participationFee)}
                        />
                      ) : null
                    )}
                  </GoogleMap>
                )}
              </>
            )}
            {/* Event List */}
            <div>
              {visibleEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
        {!loading && activeTab === 'my' && (
          <div className="flex flex-col gap-6">
            {hostedEvents.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No events yet.</div>
            ) : (
              hostedEvents.map(event => (
                <HostedEventCard
                  key={event.id}
                  event={event}
                  // Remove onViewPlayers prop and related logic
                />
              ))
            )}
            {/* Remove ParticipantsModal for hosted tab */}
          </div>
        )}
        {!loading && activeTab === 'participating' && (
          <div className="flex flex-col gap-6">
            {registeredEvents.filter(event => !!event && !!event.id).length === 0 ? (
              <div className="text-center text-gray-400 py-8">No joined events yet.</div>
            ) : (
              registeredEvents
                .filter(event => !!event && !!event.id)
                .map(event => (
                  <ParticipatingEventCard
                    key={event.id}
                    event={event}
                    onDeregister={async (id) => {
                      try {
                        await eventsApi.deregisterFromEvent(id);
                        // Refresh the registered events
                        const registeredData = await eventsApi.getMyRegisteredEvents();
                        setRegisteredEvents(registeredData.events || []);
                      } catch (error) {
                        console.error('Error deregistering from event:', error);
                        alert('Failed to deregister from event. Please try again.');
                      }
                    }}
                  />
                ))
            )}
          </div>
        )}
      </div>
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginPromptModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

export default EventsPage;