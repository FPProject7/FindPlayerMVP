import { eventsApiClient } from './axiosConfig';
import { useAuthStore } from '../stores/useAuthStore';

// Events API service
export const eventsApi = {
  // Get all available events
  getEvents: async () => {
    try {
      const response = await eventsApiClient.get('/events');
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get a specific event by ID
  getEvent: async (eventId) => {
    try {
      const response = await eventsApiClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },

  // Create a new event
  createEvent: async (eventData) => {
    try {
      const response = await eventsApiClient.post('/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Get events hosted by the current user
  getMyHostedEvents: async () => {
    try {
      const response = await eventsApiClient.get('/my-events/hosted');
      return response.data;
    } catch (error) {
      console.error('Error fetching hosted events:', error);
      throw error;
    }
  },

  // Get events the current user is registered for
  getMyRegisteredEvents: async () => {
    try {
      const response = await eventsApiClient.get('/my-events/registered');
      return response.data;
    } catch (error) {
      console.error('Error fetching registered events:', error);
      throw error;
    }
  },

  // Register for an event
  registerForEvent: async (eventId) => {
    try {
      const response = await eventsApiClient.post(`/events/${eventId}/register`);
      return response.data;
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  },

  // Deregister from an event
  deregisterFromEvent: async (eventId) => {
    try {
      const response = await eventsApiClient.delete(`/events/${eventId}/register`);
      return response.data;
    } catch (error) {
      console.error('Error deregistering from event:', error);
      throw error;
    }
  },

  // Get registered players for an event (host only)
  getRegisteredPlayers: async (eventId) => {
    try {
      const response = await eventsApiClient.get(`/events/${eventId}/players`);
      return response.data;
    } catch (error) {
      console.error('Error fetching registered players:', error);
      throw error;
    }
  },

  // Generate pre-signed URL for image upload
  generateImageUploadUrl: async (fileName, fileType) => {
    try {
      const response = await eventsApiClient.post('/events/image-upload', {
        fileName,
        contentType: fileType
      });
      return response.data;
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw error;
    }
  },

  // Upload image to S3 using pre-signed URL
  uploadImage: async (uploadUrl, file) => {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // Generate upload URL for event images
  generateEventImageUrl: async (fileName, contentType) => {
    const response = await eventsApiClient.post('/events/generate-image-url', {
      fileName,
      contentType
    });
    return response.data;
  },

  // Get count of events a user has participated in
  getUserParticipatedEventsCount: async (userId) => {
    try {
      // For now, return 0 since the backend doesn't have a public endpoint
      // for getting another user's participated events count
      // TODO: Add backend endpoint /users/{userId}/participated-events/count
      return 0;
    } catch (error) {
      console.error('Error fetching user participated events count:', error);
      return 0;
    }
  },

  // Create Stripe checkout session for event payment
  createEventPaymentSession: async (eventDraft) => {
    try {
      // Use the specific endpoint URL for this function
      const response = await fetch('https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default/create-event-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await useAuthStore.getState().getValidIdToken()}`
        },
        body: JSON.stringify({
          userId: eventDraft.userId,
          eventDraft,
          returnUrl: `${window.location.origin}/events`
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating event payment session:', error);
      throw error;
    }
  }
};

export default eventsApi; 