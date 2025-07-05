import React, { useState, useRef, useEffect, useCallback } from 'react';

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

const CreateEventForm = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef(null);

  // Google Maps Autocomplete state
  const [autocompleteValue, setAutocompleteValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);

  // Initialize Google Maps services
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsGoogleMapsReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (!checkGoogleMaps()) {
      // If not ready, poll every 100ms
      const interval = setInterval(() => {
        if (checkGoogleMaps()) {
          clearInterval(interval);
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => {
        clearInterval(interval);
      }, 10000);
    }

    // Cleanup function
    return () => {
      // Cleanup if component unmounts
    };
  }, []); // Remove isGoogleMapsReady from dependencies to prevent re-renders

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (input) => {
      if (!input.trim() || !isGoogleMapsReady || input.trim().length < 2) {
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
    [isGoogleMapsReady]
  );

  // Handle input changes
  const handleAutocompleteChange = (e) => {
    const value = e.target.value;
    setAutocompleteValue(value);
    setForm(prev => ({ ...prev, cityVenue: value }));
    
    if (isGoogleMapsReady) {
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
  const handleSuggestionSelect = (suggestion) => {
    setAutocompleteValue(suggestion.description);
    setForm(prev => ({ ...prev, cityVenue: suggestion.description }));
    setSuggestions([]);
    setShowSuggestions(false);
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
    if (!form.maxPlayers || isNaN(form.maxPlayers) || !Number.isInteger(Number(form.maxPlayers)) || Number(form.maxPlayers) <= 0) newErrors.maxPlayers = 'Enter a valid integer number of players.';
    if (String(form.maxPlayers).length > MAX_PLAYERS_LIMIT) newErrors.maxPlayers = `Max ${MAX_PLAYERS_LIMIT} digits.`;
    if (!form.participationFee.trim()) newErrors.participationFee = 'Participation fee is required.';
    if (form.participationFee.length > PARTICIPATION_FEE_LIMIT) newErrors.participationFee = `Max ${PARTICIPATION_FEE_LIMIT} characters.`;
    if (form.dressCode.length > DRESS_CODE_LIMIT) newErrors.dressCode = `Max ${DRESS_CODE_LIMIT} characters.`;
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (form.description.length > DESCRIPTION_LIMIT) newErrors.description = `Max ${DESCRIPTION_LIMIT} characters.`;
    if (!form.agree) newErrors.agree = 'You must agree to the terms.';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setIsSubmitting(true);
    // Stub: Simulate payment and backend call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmation(true);
    }, 1200);
  };

  const isFormValid = Object.keys(validate()).length === 0;

  // Placeholder functions for event confirmation modal
  const handleViewMyEvent = () => {
    // TODO: Navigate to event detail page
    console.log('View my event');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share event');
  };

  const handleClose = () => {
    setShowConfirmation(false);
  };

  // Placeholder EventCreatedConfirmation component
  const EventCreatedConfirmation = ({ event, onViewMyEvent, onShare, onClose }) => (
    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
      <div className="text-green-500 text-4xl mb-4">✓</div>
      <h3 className="text-xl font-bold mb-2">Event Created!</h3>
      <p className="text-gray-600 mb-6">Your event "{event.title}" has been successfully created.</p>
      <div className="space-y-3">
        <button
          onClick={onViewMyEvent}
          className="w-full py-2 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600"
        >
          View My Event
        </button>
        <button
          onClick={onShare}
          className="w-full py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300"
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
    </div>
  );

  return (
    <div className="relative w-full">
      {showConfirmation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-40">
          <EventCreatedConfirmation
            event={form}
            onViewMyEvent={handleViewMyEvent}
            onShare={handleShare}
            onClose={handleClose}
          />
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
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder={isGoogleMapsReady ? "Search for city and venue" : "Loading Google Maps..."}
              disabled={isSubmitting}
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
            <label className="block font-medium mb-1">Participation Fee</label>
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
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#dc2626] file:hover:bg-[#b91c1c] file:text-white"
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
  );
};

export default CreateEventForm; 