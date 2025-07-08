import { eventsApiClient } from './axiosConfig';

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
  }
};

export default eventsApi; 