import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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

    console.log('[PUSH] Token acquired:', token);

    return token;
  } catch (error) {
    console.error('[PUSH] Registration error:', error);
    return null;
  }
}
