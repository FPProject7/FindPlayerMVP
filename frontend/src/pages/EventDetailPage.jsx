import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ShareButton from '../components/common/ShareButton';
import LoginPromptModal from '../components/common/LoginPromptModal';
import { eventsApi } from '../api/eventsApi';
import { getUserInfo } from '../api/userApi';
import { useAuthStore } from '../stores/useAuthStore';
import ChallengeLoader from '../components/common/ChallengeLoader';
import { createProfileUrl } from '../utils/profileUrlUtils';
import { PUBLIC_BASE_URL } from '../config';

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

// ParticipantsModal copied from EventsPage.jsx
function ParticipantsModal({ open, onClose, participants, loading, currentPage, totalPages, onPrevPage, onNextPage, onParticipantClick }) {
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
        {loading ? (
          <div className="flex justify-center items-center py-8"><ChallengeLoader /></div>
        ) : participants.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No participants yet.</div>
        ) : (
          <>
            <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: '60vh' }}>
              {participants.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 py-3 px-2 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => onParticipantClick(user)}
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
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-4">
                <button onClick={onPrevPage} disabled={currentPage === 1} className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50">Prev</button>
                <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
                <button onClick={onNextPage} disabled={currentPage === totalPages} className="px-3 py-1 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
  const [hostInfo, setHostInfo] = useState(null);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const participantsPerPage = 10;
  
  // Hide register button if ?hostView=1 is present
  const isHostView = new URLSearchParams(location.search).get('hostView') === '1';

  // Fetch event data and host info
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const eventData = await eventsApi.getEvent(eventId);
        setEvent(eventData);
        // Check if user is the host (only if authenticated)
        if (isAuthenticated) {
          setIsHost(eventData.hostUserId === useAuthStore.getState().user?.id);
          // Check if user is registered (this would need to be implemented in the backend)
          setIsRegistered(eventData.isRegistered || false);
        }
        
        // Fetch host info if we have a hostUserId
        if (eventData.hostUserId) {
          try {
            const hostData = await getUserInfo(eventData.hostUserId);
            setHostInfo(hostData);
          } catch (hostError) {
            console.error('Error fetching host info:', hostError);
            // Fallback to showing userId if host lookup fails
            setHostInfo({
              id: eventData.hostUserId,
              name: `User ${eventData.hostUserId.slice(0, 6)}`,
              profilePictureUrl: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, isAuthenticated]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    
    setRegistering(true);
    try {
      await eventsApi.registerForEvent(eventId);
      setIsRegistered(true);
      // Refresh event data to update registration count
      const eventData = await eventsApi.getEvent(eventId);
      setEvent(eventData);
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
      setEvent(eventData);
      navigate('/events?tab=participating');
    } catch (error) {
      console.error('Error deregistering from event:', error);
      alert('Failed to deregister from event. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleViewParticipants = async () => {
    setParticipantsModalOpen(true);
    setLoadingParticipants(true);
    setCurrentPage(1);
    try {
      const playersData = await eventsApi.getRegisteredPlayers(eventId);
      // Enrich with user info
      const enriched = await Promise.all(
        (Array.isArray(playersData) ? playersData : []).map(async (reg) => {
          const user = await getUserInfo(reg.userId);
          return {
            id: reg.userId,
            name: user.name,
            profilePictureUrl: user.profilePictureUrl,
            role: user.role || 'athlete',
          };
        })
      );
      setParticipants(enriched);
    } catch (error) {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleParticipantClick = (user) => {
    const url = createProfileUrl(user.name, user.role);
    navigate(url);
  };

  const totalPages = Math.ceil(participants.length / participantsPerPage);
  const paginatedParticipants = participants.slice((currentPage - 1) * participantsPerPage, currentPage * participantsPerPage);
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // Helper function to format date and time
  const formatDateTime = (date, time) => {
    if (!date) return 'Date not set';
    
    try {
      if (time) {
        // If we have both date and time, create a full datetime
        const dateTime = new Date(`${date}T${time}`);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
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
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not set';
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mt-4 mb-8 p-8">
        <div className="text-center">
          <ChallengeLoader />
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
    <>
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
              url={`${PUBLIC_BASE_URL}/events/${eventId}`}
              title={`Check out this event: ${event.title}`}
              className="bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100"
              iconSize={20}
            />
          </div>
        </div>
        <div className="p-5">
          <div className="font-bold text-xl mb-1">{event.title}</div>
          <div className="text-gray-500 text-sm mb-2">
            {event.sport && event.eventType
              ? `${event.sport} | ${event.eventType}`
              : event.sport || event.eventType || ''}
          </div>
          <div className="flex items-center text-gray-600 mb-2">
            <UserIcon className="text-black mr-2" size={18} />
            <span>Hosted by <span className="font-semibold text-gray-800">{hostInfo?.name || event.hostUserId || 'Unknown Host'}</span></span>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center text-gray-800">
              <CalendarIcon className="text-black mr-2" size={18} />
              <span>{formatDateTime(event.date, event.time)}</span>
            </div>
            <div className="flex items-center text-gray-800">
              <LocationIcon className="text-black mr-2" size={18} />
              <span>{event.location || 'Location not set'}</span>
            </div>
            <div className="flex items-center text-gray-800">
              <UserIcon className="text-black mr-2" size={18} />
              <span>{(event.currentParticipantCount !== undefined ? event.currentParticipantCount : (event.registeredPlayers || 0))} / {event.maxParticipants || event.maxPlayers || 0} players registered</span>
            </div>
            <div className="flex items-center text-gray-800">
              <DollarIcon className="text-black mr-2" size={18} />
              <span>{
                event.participationFee !== undefined &&
                event.participationFee !== null &&
                event.participationFee !== '' &&
                !isNaN(Number(event.participationFee))
                  ? `$${Number(event.participationFee)}`
                  : 'Free'
              } per player</span>
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
          {!isHostView && (
            isRegistered ? (
              <button
                className="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg mt-2 hover:bg-red-600 transition disabled:opacity-50"
                onClick={handleUnregister}
                disabled={registering}
              >
                {registering ? 'Deregistering...' : 'Deregister'}
              </button>
            ) : ((event.currentParticipantCount !== undefined ? event.currentParticipantCount : (event.registeredPlayers || 0)) >= (event.maxParticipants || event.maxPlayers || 0)) ? (
              <button
                className="w-full py-3 rounded-full bg-gray-400 text-white font-bold text-lg mt-2 cursor-not-allowed"
                disabled={true}
              >
                Event Full
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
          {/* View Participants button for everyone */}
          <button
            className="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg mt-2 hover:bg-red-600 transition"
            onClick={handleViewParticipants}
          >
            View Participants
          </button>
        </div>
        <ParticipantsModal
          open={participantsModalOpen}
          onClose={() => setParticipantsModalOpen(false)}
          participants={paginatedParticipants}
          loading={loadingParticipants}
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onParticipantClick={handleParticipantClick}
        />
      </div>
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginPromptModal onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
};

export default EventDetailPage; 