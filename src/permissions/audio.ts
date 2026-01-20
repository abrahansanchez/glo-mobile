import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);

  return result === RESULTS.GRANTED;
}
