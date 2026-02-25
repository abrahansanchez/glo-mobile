import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';
const EXPO_PUSH_PROJECT_ID_KEY = 'expoPushProjectId';
let notificationHandlerConfigured = false;
let registerInFlightKey = null;
let registerInFlightPromise = null;
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

function isValidExpoPushToken(token) {
  return typeof token === 'string' && EXPO_TOKEN_PATTERN.test(token);
}

/**
 * Registers the device for push notifications.
 * Returns:
 *   - Expo push token (string)
 *   - null if unavailable or denied
 *
 * NOTE:
 * - Does NOT send token to backend yet
 * - Safe to call on every app launch
 */
export async function registerForPushNotifications() {
  try {
    // Push notifications do NOT work on emulators/simulators
    if (!Device.isDevice) {
      console.log('[PUSH] Skipped: not a physical device');
      return null;
    }

    // Check existing permissions
    const permissionResponse = await Notifications.getPermissionsAsync();
    let finalStatus = permissionResponse.status;

    // Ask user if not already granted
    if (finalStatus !== 'granted') {
      const requestResponse =
        await Notifications.requestPermissionsAsync();
      finalStatus = requestResponse.status;
    }

    console.log('[PUSH] permission status:', finalStatus);

    // User denied permissions
    if (finalStatus !== 'granted') {
      console.log('[PUSH] Permission not granted');
      return null;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    console.log('[PUSH] projectId:', projectId);

    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    const token = tokenResponse.data;

    console.log('[PUSH] token acquired:', token);
    const apns = await Notifications.getDevicePushTokenAsync();
    console.log('[PUSH] apns token present?', !!apns?.data);

    return { token, projectId };
  } catch (error) {
    console.error('[PUSH] Registration error:', error);
    return null;
  }
}

async function registerTokenWithBackend(token, projectId) {
  if (!isValidExpoPushToken(token)) {
    console.log('[PUSH_REGISTER] skipped invalid expo token format');
    return null;
  }

  const lastRegisteredToken = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  const lastRegisteredProjectId = await SecureStore.getItemAsync(EXPO_PUSH_PROJECT_ID_KEY);
  if (lastRegisteredToken === token && lastRegisteredProjectId === (projectId || '')) {
    console.log('[PUSH] token already registered, skipping');
    return token;
  }

  const registrationKey = `${token}|${projectId || ''}`;
  if (registerInFlightPromise && registerInFlightKey === registrationKey) {
    console.log('[PUSH_REGISTER] dedupe in-flight registration', { registrationKey });
    return registerInFlightPromise;
  }

  const maxRetries = 2;
  const attemptCount = maxRetries + 1;

  registerInFlightKey = registrationKey;
  registerInFlightPromise = (async () => {
    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      try {
        console.log(`[PUSH_REGISTER] attempt ${attempt}`);
        const response = await api.post('/push/register', { token });
        console.log('[PUSH] register response:', response?.data);
        console.log('[PUSH_REGISTER] success');
        break;
      } catch (error) {
        console.log('[PUSH_REGISTER] failed', {
          attempt,
          error: error?.response?.data || error?.message || error,
        });

        if (attempt >= attemptCount) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }

    await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(EXPO_PUSH_PROJECT_ID_KEY, projectId || '');
    console.log('[PUSH] token registered with backend');
    return token;
  })();

  try {
    return await registerInFlightPromise;
  } finally {
    registerInFlightPromise = null;
    registerInFlightKey = null;
  }
}

export async function registerExpoPushTokenIfNeeded() {
  const tokenResult = await registerForPushNotifications();
  if (!tokenResult?.token) {
    return null;
  }
  const { token, projectId } = tokenResult;
  return registerTokenWithBackend(token, projectId);
}

export async function registerProvidedExpoPushTokenIfNeeded(token) {
  if (!token) {
    return null;
  }
  if (!isValidExpoPushToken(token)) {
    console.log('[PUSH_REGISTER] token_refresh_event ignored non-Expo token');
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  return registerTokenWithBackend(token, projectId);
}

export function setupPushTokenRefreshRegistration(onPushTokenRefresh) {
  if (typeof Notifications.addPushTokenListener !== 'function') {
    console.log('[PUSH] addPushTokenListener unavailable on this SDK runtime');
    return () => {};
  }

  const subscription = Notifications.addPushTokenListener((tokenInfo) => {
    const maybeToken = tokenInfo?.data || null;
    const isExpo = isValidExpoPushToken(maybeToken);

    console.log('[PUSH] token refresh event', { hasToken: !!maybeToken, isExpo });

    if (isExpo && typeof onPushTokenRefresh === 'function') {
      onPushTokenRefresh(maybeToken);
    } else {
      console.log('[PUSH] token refresh ignored (not an Expo token)');
    }
  });

  return () => {
    try {
      subscription?.remove?.();
    } catch (error) {
      console.log('[PUSH] token listener cleanup error', error?.message || error);
    }
  };
}

export function setupForegroundPushLogging() {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  const sub1 = Notifications.addNotificationReceivedListener((n) => {
    const data = n?.request?.content?.data || {};
    const mappedCallSid = data?.call_sid || data?.callSid || data?.CallSid || null;
    console.log(
      '[PUSH] received (foreground):',
      n?.request?.content?.title,
      n?.request?.content?.body,
      data
    );
    console.log('[PUSH] call_sid mapping', {
      call_sid: data?.call_sid || null,
      callSid: data?.callSid || null,
      CallSid: data?.CallSid || null,
      mappedCallSid,
    });
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
    console.log('[PUSH] tapped:', r?.notification?.request?.content?.data);
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}
