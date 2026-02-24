import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import api from '../config/api';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';
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

    // Get Expo push token
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const token = tokenResponse.data;

    console.log('[PUSH] token acquired:', token);

    return token;
  } catch (error) {
    console.error('[PUSH] Registration error:', error);
    return null;
  }
}

export async function registerExpoPushTokenIfNeeded() {
  const token = await registerForPushNotifications();
  if (!token) {
    return null;
  }

  const lastRegisteredToken = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  if (lastRegisteredToken === token) {
    console.log('[PUSH] token already registered, skipping');
    return token;
  }

  await api.post('/push/register', { token });
  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token);
  console.log('[PUSH] token registered with backend');
  return token;
}

export function setupForegroundPushLogging() {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PUSH] received', notification?.request?.content?.data || {});
  });

  return () => {
    subscription.remove();
  };
}
