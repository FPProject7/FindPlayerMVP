import axios from 'axios';

const EVENTS_API_BASE = 'https://frf2mofcw1.execute-api.us-east-1.amazonaws.com/prod';
const CHECKOUT_SESSION_URL = 'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default/create-event-checkout-session';

export const eventsApi = {
  // Create Stripe Checkout Session for event payment (creates event and returns payment URL)
  createEventPaymentSession: async ({ userId, eventDraft, returnUrl }) => {
    const response = await axios.post(CHECKOUT_SESSION_URL, {
      userId,
      eventDraft,
      returnUrl,
    });
    return response.data;
  },

  // Fetch all events (public)
  getEvents: async () => {
    const response = await axios.get(`${EVENTS_API_BASE}/findplayer-list-events`);
    return response.data;
  },

  // Fetch events hosted by the current user
  getMyHostedEvents: async () => {
    const response = await axios.get(`${EVENTS_API_BASE}/findplayer-list-my-hosted-events`);
    return response.data;
  },

  // Fetch events the current user is registered for
  getMyRegisteredEvents: async () => {
    const response = await axios.get(`${EVENTS_API_BASE}/findplayer-list-my-registered-events`);
    return response.data;
  },

  // Fetch a single event by eventId
  getEvent: async (eventId) => {
    const response = await axios.get(`${EVENTS_API_BASE}/findplayer-get-event/${eventId}`);
    return response.data;
  },

  // Deregister from event
  deregisterFromEvent: async (eventId) => {
    const response = await axios.post(`${EVENTS_API_BASE}/findplayer-deregister-from-event`, { eventId });
    return response.data;
  },

  // Register for event
  registerForEvent: async (eventId) => {
    const response = await axios.post(`${EVENTS_API_BASE}/findplayer-register-for-event`, { eventId });
    return response.data;
  },

  // Generate event image upload URL
  generateImageUploadUrl: async (fileName, contentType) => {
    const response = await axios.post(`${EVENTS_API_BASE}/findplayer-generate-event-image-url`, { fileName, contentType });
    return response.data;
  },

  // List registered players for an event (if needed)
  getRegisteredPlayers: async (eventId) => {
    const response = await axios.get(`${EVENTS_API_BASE}/findplayer-list-registered-players/${eventId}`);
    return response.data;
  },
};