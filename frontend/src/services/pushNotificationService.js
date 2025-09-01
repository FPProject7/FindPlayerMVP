import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const REGISTER_TOKEN_URL = 'https://y219q4oqh5.execute-api.us-east-1.amazonaws.com/default/update-user-status';

const PENDING_TOKEN_KEY = 'pending_device_token_v1';
let authEventListenerAttached = false;

function cachePendingToken(deviceToken, platform) {
  try {
    localStorage.setItem(PENDING_TOKEN_KEY, JSON.stringify({ deviceToken, platform, ts: Date.now() }));
  } catch (e) {
    // Silent fail
  }
}

async function tryUploadPendingToken() {
  try {
    const raw = localStorage.getItem(PENDING_TOKEN_KEY);
    if (!raw) return;
    const { deviceToken, platform } = JSON.parse(raw);
    if (!deviceToken) return;
    await uploadDeviceTokenToBackend(deviceToken, platform, { skipCacheOnFail: true });
    localStorage.removeItem(PENDING_TOKEN_KEY);
  } catch (e) {
    // Silent fail, will retry later
  }
}

function attachAuthListenerOnce() {
  if (authEventListenerAttached) return;
  if (typeof window === 'undefined') return;
  window.addEventListener('auth:loggedin', () => {
    tryUploadPendingToken();
  });
  authEventListenerAttached = true;
}

async function uploadDeviceTokenToBackend(deviceToken, platform, options = {}) {
  try {
    const token = await useAuthStore.getState().getValidToken();
    const payload = { deviceToken, platform };
    
    const response = await axios.post(
      REGISTER_TOKEN_URL,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // If not authenticated yet, cache token and retry after login
    const notAuthed = err?.message?.includes('User not authenticated') || err?.response?.status === 401;
    if (!options.skipCacheOnFail && notAuthed) {
      cachePendingToken(deviceToken, platform);
      attachAuthListenerOnce();
    }
  }
}

// Track listener handles to avoid duplicate attachments across re-invocations
let registrationHandle;
let registrationErrorHandle;
let receivedHandle;
let actionHandle;

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') {
        return;
      }
    }

    // If already authenticated, try uploading any pending token; otherwise just attach listener for later
    if (useAuthStore.getState().isAuthenticated) {
      tryUploadPendingToken();
    } else {
      attachAuthListenerOnce();
    }

    // Clean up any existing listeners to prevent duplicate callbacks
    try {
      await PushNotifications.removeAllListeners();
      registrationHandle = undefined;
      registrationErrorHandle = undefined;
      receivedHandle = undefined;
      actionHandle = undefined;
    } catch (e) {
      // Silent cleanup
    }

    // Add a timeout to detect if registration never completes
    const registrationTimeout = setTimeout(() => {
      // Registration timeout - silent fail
    }, 10000);

    // Attach listeners BEFORE calling register so we don't miss early events
    registrationErrorHandle = PushNotifications.addListener('registrationError', (error) => {
      // Silent error handling
    });

    registrationHandle = PushNotifications.addListener('registration', async (token) => {
      // Clear the timeout since we got the event
      clearTimeout(registrationTimeout);
      
      const value = token?.value;
      const platform = Capacitor.getPlatform();
      
      if (value) {
        if (useAuthStore.getState().isAuthenticated) {
          await uploadDeviceTokenToBackend(value, platform);
        } else {
          cachePendingToken(value, platform);
          attachAuthListenerOnce();
        }
      }
    });

    receivedHandle = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Handle received notifications
    });

    actionHandle = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      // Handle notification actions
    });

    // Register the device for push notifications
    try {
      await PushNotifications.register();
    } catch (registerError) {
      clearTimeout(registrationTimeout);
      return;
    }

  } catch (error) {
    // Silent error handling
  }
}

// No default export to avoid multiple implementations; use registerPushNotifications()
