import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';
const EXPO_PUSH_PROJECT_ID_KEY = 'expoPushProjectId';
let notificationHandlerConfigured = false;

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

export async function registerExpoPushTokenIfNeeded() {
  const tokenResult = await registerForPushNotifications();
  if (!tokenResult?.token) {
    return null;
  }
  const { token, projectId } = tokenResult;

  const lastRegisteredToken = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  const lastRegisteredProjectId = await SecureStore.getItemAsync(EXPO_PUSH_PROJECT_ID_KEY);
  if (lastRegisteredToken === token && lastRegisteredProjectId === (projectId || '')) {
    console.log('[PUSH] token already registered, skipping');
    return token;
  }

  try {
    const response = await api.post('/push/register', { token });
    console.log('[PUSH] register response:', response?.data);
  } catch (error) {
    console.log('[PUSH] register failed:', error?.response?.data || error?.message || error);
    throw error;
  }

  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
  await SecureStore.setItemAsync(EXPO_PUSH_PROJECT_ID_KEY, projectId || '');
  console.log('[PUSH] token registered with backend');
  return token;
}

export function setupForegroundPushLogging() {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  const sub1 = Notifications.addNotificationReceivedListener((n) => {
    console.log(
      '[PUSH] received (foreground):',
      n?.request?.content?.title,
      n?.request?.content?.body,
      n?.request?.content?.data
    );
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
    console.log('[PUSH] tapped:', r?.notification?.request?.content?.data);
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
}
