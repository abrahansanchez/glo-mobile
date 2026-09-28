import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';
import { getBarber } from '../auth/barberStorage';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';
const EXPO_PUSH_PROJECT_ID_KEY = 'expoPushProjectId';
const EXPO_PUSH_OWNER_KEY = 'expoPushOwner';
let notificationHandlerConfigured = false;
const registrationPromises = new Map();
const EXPO_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

function isValidExpoPushToken(token) {
  return typeof token === 'string' && EXPO_TOKEN_PATTERN.test(token);
}

function correlationId(value) {
  if (value == null || value === '') return null;
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `ref_${(hash >>> 0).toString(16).padStart(8, '0')}`;
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

    console.log('[PUSH] project configuration present?', !!projectId);

    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

    const token = tokenResponse.data;

    console.log('[PUSH] Expo token acquired?', !!token);
    const apns = await Notifications.getDevicePushTokenAsync();
    console.log('[PUSH] apns token present?', !!apns?.data);

    return { token, projectId };
  } catch (error) {
    console.error('[PUSH] Registration failed', {
      status: error?.response?.status || null,
      code: error?.code || null,
    });
    return null;
  }
}

function resolveBarberId(barber) {
  const value = barber?._id || barber?.id || null;
  return value == null ? null : String(value);
}

async function getCurrentOwner() {
  return resolveBarberId(await getBarber());
}

function normalizeOwner(owner) {
  return owner == null || String(owner).trim() === '' ? null : String(owner);
}

async function ownerStillMatches(expectedOwner) {
  return (await getCurrentOwner()) === expectedOwner;
}

async function registerTokenWithBackend(token, projectId, expectedOwner) {
  if (!isValidExpoPushToken(token)) {
    console.log('[PUSH_REGISTER] skipped invalid expo token format');
    return null;
  }

  const owner = normalizeOwner(expectedOwner);
  if (!owner || !(await ownerStillMatches(owner))) {
    console.log('[PUSH_REGISTER] skipped without matching authenticated owner', {
      hasExpectedOwner: !!owner,
    });
    return null;
  }

  const lastRegisteredToken = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  const lastRegisteredProjectId = await SecureStore.getItemAsync(EXPO_PUSH_PROJECT_ID_KEY);
  const lastRegisteredOwner = await SecureStore.getItemAsync(EXPO_PUSH_OWNER_KEY);
  if (
    lastRegisteredToken === token &&
    lastRegisteredProjectId === (projectId || '') &&
    lastRegisteredOwner === owner
  ) {
    console.log('[PUSH] token already registered, skipping');
    return token;
  }

  const registrationKey = `${owner}|${token}|${projectId || ''}`;
  const existingPromise = registrationPromises.get(registrationKey);
  if (existingPromise) {
    console.log('[PUSH_REGISTER] dedupe in-flight registration');
    return existingPromise;
  }

  const maxRetries = 2;
  const attemptCount = maxRetries + 1;

  const registrationPromise = (async () => {
    for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
      try {
        if (!(await ownerStillMatches(owner))) {
          console.log('[PUSH_REGISTER] cancelled after owner changed', { stage: 'before_request' });
          return null;
        }
        console.log(`[PUSH_REGISTER] attempt ${attempt}`);
        await api.post('/push/register', { token });
        console.log('[PUSH_REGISTER] success');
        break;
      } catch (error) {
        console.log('[PUSH_REGISTER] failed', {
          attempt,
          status: error?.response?.status || null,
          code: error?.code || null,
        });

        if (attempt >= attemptCount) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }

    if (!(await ownerStillMatches(owner))) {
      console.log('[PUSH_REGISTER] cache skipped after owner changed');
      return null;
    }
    await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
    if (!(await ownerStillMatches(owner))) {
      console.log('[PUSH_REGISTER] project cache skipped after owner changed');
      return null;
    }
    await SecureStore.setItemAsync(EXPO_PUSH_PROJECT_ID_KEY, projectId || '');
    if (!(await ownerStillMatches(owner))) {
      console.log('[PUSH_REGISTER] owner cache skipped after owner changed');
      return null;
    }
    await SecureStore.setItemAsync(EXPO_PUSH_OWNER_KEY, owner);
    console.log('[PUSH] token registered with backend');
    return token;
  })();
  registrationPromises.set(registrationKey, registrationPromise);

  try {
    return await registrationPromise;
  } finally {
    if (registrationPromises.get(registrationKey) === registrationPromise) {
      registrationPromises.delete(registrationKey);
    }
  }
}

export async function registerExpoPushTokenIfNeeded(expectedOwner) {
  const tokenResult = await registerForPushNotifications();
  if (!tokenResult?.token) {
    return null;
  }
  const { token, projectId } = tokenResult;
  return registerTokenWithBackend(token, projectId, expectedOwner);
}

export async function registerProvidedExpoPushTokenIfNeeded(token, expectedOwner) {
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

  return registerTokenWithBackend(token, projectId, expectedOwner);
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
      console.log('[PUSH] token listener cleanup error', {
        status: error?.response?.status || null,
        code: error?.code || null,
      });
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
    console.log('[PUSH] received in foreground', {
      hasTitle: !!n?.request?.content?.title,
      hasBody: !!n?.request?.content?.body,
      hasData: Object.keys(data).length > 0,
      callRef: correlationId(mappedCallSid),
    });
    console.log('[PUSH] call_sid mapping', {
      hasSnakeCase: !!data?.call_sid,
      hasCamelCase: !!data?.callSid,
      hasPascalCase: !!data?.CallSid,
      callRef: correlationId(mappedCallSid),
    });
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
    const data = r?.notification?.request?.content?.data || {};
    const mappedCallSid = data?.call_sid || data?.callSid || data?.CallSid || null;
    console.log('[PUSH] notification tapped', {
      hasData: Object.keys(data).length > 0,
      callRef: correlationId(mappedCallSid),
    });
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}
