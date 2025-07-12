import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../api/eventsApi';
import { useLoadScript } from '@react-google-maps/api';
import { PUBLIC_BASE_URL } from '../../config';

// Toast for share/copy feedback - exact same as profile page
const ShareToast = ({ message }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
    <div className="bg-red-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-semibold opacity-95 animate-fade-in-out">
      {message}
    </div>
  </div>
);

const initialState = {
  title: '',
  sport: '',
  eventType: '',
  cityVenue: '',
  date: '',
  time: '',
  maxPlayers: '',
  participationFee: '',
  dressCode: '',
  imageFile: null,
  imagePreview: null,
  description: '',
  agree: false,
  coordinates: null,
};

const sportsOptions = [
  { value: '', label: 'Select sport' },
  { value: 'football', label: 'Football' },
  { value: 'basketball', label: 'Basketball' },
];

const eventTypeOptionsBySport = {
  football: [
    { value: '', label: 'Select type' },
    { value: '5v5-volta', label: '5v5 Volta' },
    { value: '7v7', label: '7v7' },
    { value: '11v11', label: '11v11 Full Pitch' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'tryout', label: 'Tryout' },
    { value: 'tournament', label: 'Tournament' },
  ],
  basketball: [
    { value: '', label: 'Select type' },
    { value: '3v3-halfcourt', label: '3v3 Half Court' },
    { value: '5v5-fullcourt', label: '5v5 Full Court' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'tryout', label: 'Tryout' },
    { value: 'tournament', label: 'Tournament' },
  ],
};

const TITLE_LIMIT = 50;
const MAX_PLAYERS_LIMIT = 5; // 5 digits
const DRESS_CODE_LIMIT = 40;
const PARTICIPATION_FEE_LIMIT = 30;
const DESCRIPTION_LIMIT = 300;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const CreateEventForm = ({ onClose }) => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdEventData, setCreatedEventData] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Google Maps Autocomplete state
  const [autocompleteValue, setAutocompleteValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Use useLoadScript from @react-google-maps/api
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // Additional state for event confirmation modal
  const [showShareToast, setShowShareToast] = useState(false);
  const [shareToastMsg, setShareToastMsg] = useState('');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (input) => {
      if (!input.trim() || !isLoaded || input.trim().length < 2) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      try {
        setIsLoadingSuggestions(true);
        
        const request = {
          input,
          // Remove types restriction to get more results
          // types: ['establishment', 'geocode'],
          // Remove country restriction for worldwide search
          // componentRestrictions: { country: 'KW' },
        };

        // Use the stable AutocompleteService API (will be supported for at least 12 more months)
        let predictions = [];
        
        try {
          const service = new window.google.maps.places.AutocompleteService();
          predictions = await new Promise((resolve, reject) => {
            service.getPlacePredictions(request, (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                resolve(predictions);
              } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                // ZERO_RESULTS is not an error, just no results found
                resolve([]);
              } else {
                reject(new Error(`Places API error: ${status}`));
              }
            });
          });
        } catch (error) {
          console.error('AutocompleteService failed:', error);
          predictions = [];
        }
        
        setSuggestions(predictions || []);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300),
    [isLoaded]
  );

  // Handle input changes
  const handleAutocompleteChange = (e) => {
    const value = e.target.value;
    setAutocompleteValue(value);
    setForm(prev => ({ ...prev, cityVenue: value }));
    
    if (isLoaded) {
      setShowSuggestions(true);
      
      if (value.trim()) {
        debouncedSearch(value);
      } else {
        setSuggestions([]);
      }
    } else {
      // Fallback: just update the form value without autocomplete
      setSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion) => {
    setAutocompleteValue(suggestion.description);
    setForm(prev => ({ ...prev, cityVenue: suggestion.description }));
    setSuggestions([]);
    setShowSuggestions(false);
    // Fetch coordinates using Places API
    if (window.google && window.google.maps && window.google.maps.places) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ placeId: suggestion.place_id }, (results, status) => {
        if (status === 'OK' && results && results[0] && results[0].geometry && results[0].geometry.location) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          setForm(prev => ({ ...prev, coordinates: { lat, lng } }));
        } else {
          setForm(prev => ({ ...prev, coordinates: null }));
        }
      });
    }
  };

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Event title is required.';
    if (form.title.length > TITLE_LIMIT) newErrors.title = `Max ${TITLE_LIMIT} characters.`;
    if (!form.sport) newErrors.sport = 'Sport is required.';
    if (!form.eventType) newErrors.eventType = 'Event type is required.';
    if (!form.cityVenue.trim()) newErrors.cityVenue = 'City & Venue is required.';
    if (!form.date) newErrors.date = 'Date is required.';
    if (!form.time) newErrors.time = 'Time is required.';
    if (form.date && form.time) {
      // Combine date and time into a Date object
      const [year, month, day] = form.date.split('-').map(Number);
      const [hour, minute] = form.time.split(':').map(Number);
      const eventDate = new Date(year, month - 1, day, hour, minute);
      if (isNaN(eventDate.getTime()) || eventDate <= new Date()) {
        newErrors.date = 'Date and time must be in the future.';
        newErrors.time = 'Date and time must be in the future.';
      }
    }
    if (!form.maxPlayers || isNaN(form.maxPlayers) || !Number.isInteger(Number(form.maxPlayers)) || Number(form.maxPlayers) <= 0) newErrors.maxPlayers = 'Enter a valid integer number of players.';
    if (String(form.maxPlayers).length > MAX_PLAYERS_LIMIT) newErrors.maxPlayers = `Max ${MAX_PLAYERS_LIMIT} digits.`;
    if (!form.participationFee.trim()) newErrors.participationFee = 'Participation fee is required.';
    if (form.participationFee.length > PARTICIPATION_FEE_LIMIT) newErrors.participationFee = `Max ${PARTICIPATION_FEE_LIMIT} characters.`;
    if (form.dressCode.length > DRESS_CODE_LIMIT) newErrors.dressCode = `Max ${DRESS_CODE_LIMIT} characters.`;
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (form.description.length > DESCRIPTION_LIMIT) newErrors.description = `Max ${DESCRIPTION_LIMIT} characters.`;
    if (!form.agree) newErrors.agree = 'You must agree to the terms.';
    // imageFile is optional, so no validation here
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;
    if (name === 'title') newValue = value.slice(0, TITLE_LIMIT);
    if (name === 'maxPlayers') newValue = value.replace(/[^0-9]/g, '').slice(0, MAX_PLAYERS_LIMIT);
    if (name === 'dressCode') newValue = value.slice(0, DRESS_CODE_LIMIT);
    if (name === 'participationFee') newValue = value.slice(0, PARTICIPATION_FEE_LIMIT);
    if (name === 'description') newValue = value.slice(0, DESCRIPTION_LIMIT);
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : newValue,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, imageFile: null, imagePreview: null }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageFile: 'Only image files are allowed.' }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageFile: 'Image must be less than 2MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, imageFile: file, imagePreview: reader.result }));
    };
    reader.readAsDataURL(file);
    setErrors((prev) => ({ ...prev, imageFile: undefined }));
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, imageFile: null, imagePreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = null;
      
      // Handle image upload if there's an image file
      if (form.imageFile) {
        // Generate unique filename
        const fileExtension = form.imageFile.name.split('.').pop();
        const fileName = `event-images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        // Get pre-signed URL
        const uploadData = await eventsApi.generateImageUploadUrl(fileName, form.imageFile.type);
        
        // Upload to S3
        await eventsApi.uploadImage(uploadData.uploadUrl, form.imageFile);
        
        // Get the public URL
        imageUrl = uploadData.publicUrl;
      }
      
      // Prepare event data for backend
      const eventData = {
        title: form.title,
        sport: form.sport,
        eventType: form.eventType,
        location: form.cityVenue,
        date: form.date,
        time: form.time,
        maxParticipants: parseInt(form.maxPlayers),
        participationFee: form.participationFee,
        dressCode: form.dressCode,
        description: form.description,
        imageUrl: imageUrl,
        coordinates: form.coordinates || undefined,
      };
      
      // Create event
      const createdEvent = await eventsApi.createEvent(eventData);
      
      setIsSubmitting(false);
      setShowConfirmation(true);
      
      // Store the created event for the confirmation modal
      setCreatedEventData(createdEvent);
      
    } catch (error) {
      setIsSubmitting(false);
      console.error('Error creating event:', error);
      
      if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else if (error.message) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to create event. Please try again.');
      }
    }
  };

  const isFormValid = Object.keys(validate()).length === 0;

  // Functions for event confirmation modal
  const handleViewMyEvent = () => {
    if (createdEventData?.id || createdEventData?.eventId) {
      // Always use eventId if present, fallback to id
      const eventId = createdEventData.eventId || createdEventData.id;
      navigate(`/events/${eventId}?hostView=1`);
      setShowConfirmation(false);
      setCreatedEventData(null);
      setForm(initialState);
      // Close the modal if onClose prop is provided
      if (onClose) {
        onClose();
      }
    }
  };

  const handleShare = async () => {
    if (createdEventData?.id || createdEventData?.eventId) {
      const eventId = createdEventData.eventId || createdEventData.id;
      const shareUrl = `${PUBLIC_BASE_URL}/events/${eventId}`;
      // Try Web Share API first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({ title: createdEventData.title || 'Check out this event!', url: shareUrl });
          setShareToastMsg('Link shared!');
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 1500);
          return;
        } catch (e) {
          // fallback to copy
        }
      }
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToastMsg('Copied!');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 1500);
      } catch (e) {
        setShareToastMsg('Failed to copy');
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 1500);
      }
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setCreatedEventData(null);
    setForm(initialState);
    // Optionally, if this form is in a modal, call a prop like onClose();
  };

  // EventCreatedConfirmation component
  const EventCreatedConfirmation = ({ event, onViewMyEvent, onShare, onClose, showShareToast, shareToastMsg }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center shadow-xl relative">
        <div className="text-green-500 text-4xl mb-4">✓</div>
        <h3 className="text-xl font-bold mb-2">Event Created!</h3>
        <p className="text-gray-600 mb-6">Your event "{event?.title || 'Event'}" has been successfully created.</p>
        <div className="space-y-3">
          <button
            onClick={onViewMyEvent}
            className="w-full py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600"
          >
            View My Event
          </button>
          <button
            onClick={onShare}
            className="w-full py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 relative"
          >
            Share Event
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
        {showShareToast && <ShareToast message={shareToastMsg} />}
      </div>
    </div>
  );

  return (
    <>
      {showConfirmation && (
        <EventCreatedConfirmation
          event={createdEventData}
          onViewMyEvent={handleViewMyEvent}
          onShare={handleShare}
          onClose={handleClose}
          showShareToast={showShareToast}
          shareToastMsg={shareToastMsg}
        />
      )}
      {!showConfirmation && (
        <div className="relative w-full">
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Event Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Name of the event"
                disabled={isSubmitting}
                maxLength={TITLE_LIMIT}
              />
              <div className="text-xs text-gray-400 text-right">{form.title.length}/{TITLE_LIMIT}</div>
              {errors.title && <div className="text-red-500 text-xs mt-1">{errors.title}</div>}
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block font-medium mb-1">Sport</label>
                <select
                  name="sport"
                  value={form.sport}
                  onChange={e => {
                    handleChange(e);
                    // Reset event type if sport changes
                    setForm(prev => ({ ...prev, eventType: '' }));
                  }}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={isSubmitting}
                >
                  {sportsOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {errors.sport && <div className="text-red-500 text-xs mt-1">{errors.sport}</div>}
              </div>
              <div className="flex-1">
                <label className="block font-medium mb-1">Event Type</label>
                <select
                  name="eventType"
                  value={form.eventType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={isSubmitting || !form.sport}
                >
                  {(eventTypeOptionsBySport[form.sport] || [{ value: '', label: 'Select type' }]).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.eventType && <div className="text-red-500 text-xs mt-1">{errors.eventType}</div>}
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">City & Venue Name</label>
              <div className="relative">
                <input
                  type="text"
                  name="cityVenue"
                  value={autocompleteValue}
                  onChange={handleAutocompleteChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder={isLoaded ? "Search for city and venue" : "Loading Google Maps..."}
                  disabled={isSubmitting || !isLoaded}
                  autoComplete="off"
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 rounded shadow max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.place_id}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <div className="font-medium">{suggestion.structured_formatting?.main_text || suggestion.description}</div>
                        {suggestion.structured_formatting?.secondary_text && (
                          <div className="text-sm text-gray-500">{suggestion.structured_formatting.secondary_text}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errors.cityVenue && <div className="text-red-500 text-xs mt-1">{errors.cityVenue}</div>}
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={isSubmitting}
                />
                {errors.date && <div className="text-red-500 text-xs mt-1">{errors.date}</div>}
              </div>
              <div className="flex-1">
                <label className="block font-medium mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={isSubmitting}
                />
                {errors.time && <div className="text-red-500 text-xs mt-1">{errors.time}</div>}
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block font-medium mb-1">Max Players</label>
                <input
                  type="text"
                  name="maxPlayers"
                  value={form.maxPlayers}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Number of players"
                  min={1}
                  disabled={isSubmitting}
                  maxLength={MAX_PLAYERS_LIMIT}
                />
                <div className="text-xs text-gray-400 text-right">{String(form.maxPlayers).length}/{MAX_PLAYERS_LIMIT}</div>
                {errors.maxPlayers && <div className="text-red-500 text-xs mt-1">{errors.maxPlayers}</div>}
              </div>
              <div className="flex-1">
                <label className="block font-medium mb-1">Player fee</label>
                <input
                  type="text"
                  name="participationFee"
                  value={form.participationFee}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="E.g., '$10 per player (cash only)'"
                  disabled={isSubmitting}
                  maxLength={PARTICIPATION_FEE_LIMIT}
                />
                <div className="text-xs text-gray-400 text-right">{form.participationFee.length}/{PARTICIPATION_FEE_LIMIT}</div>
                {errors.participationFee && <div className="text-red-500 text-xs mt-1">{errors.participationFee}</div>}
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Dress Code / Note</label>
              <input
                type="text"
                name="dressCode"
                value={form.dressCode}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="E.g., 'Come in sportswear'"
                disabled={isSubmitting}
                maxLength={DRESS_CODE_LIMIT}
              />
              <div className="text-xs text-gray-400 text-right">{form.dressCode.length}/{DRESS_CODE_LIMIT}</div>
              {errors.dressCode && <div className="text-red-500 text-xs mt-1">{errors.dressCode}</div>}
            </div>
            <div>
              <label className="block font-medium mb-1">Upload Image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#FF0505] file:hover:bg-[#CC0000] file:text-white"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">Maximum file size: 2MB. Supported formats: JPG, PNG, GIF</p>
              {form.imagePreview && (
                <div className="mt-2 relative flex justify-center">
                  <div className="relative w-full max-w-2xl bg-gray-100 border border-gray-300 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '350px' }}>
                    <img
                      src={form.imagePreview}
                      alt="Preview"
                      className="absolute top-0 left-0 w-full h-full object-contain"
                      style={{ background: '#f3f4f6' }}
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              {errors.imageFile && <div className="text-red-500 text-xs mt-1">{errors.imageFile}</div>}
            </div>
            <div>
              <label className="block font-medium mb-1">Full Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={4}
                placeholder="Describe what the event is about"
                disabled={isSubmitting}
                maxLength={DESCRIPTION_LIMIT}
              />
              <div className="text-xs text-gray-400 text-right">{form.description.length}/{DESCRIPTION_LIMIT}</div>
              {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <label className="text-sm">I agree to pay the $100 posting fee and confirm this event is real.</label>
            </div>
            {errors.agree && <div className="text-red-500 text-xs mt-1">{errors.agree}</div>}
            {submitError && <div className="text-red-500 text-sm mt-2">{submitError}</div>}
            <button
              type="submit"
              className="w-full py-2 rounded-full bg-red-500 text-white font-bold text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? 'Processing...' : 'Continue to Payment'}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CreateEventForm; 