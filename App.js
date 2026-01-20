import { useEffect } from 'react';
import { AuthProvider } from "./src/auth/authContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { registerForPushNotifications } from "./src/notifications/pushNotifications";

export default function App() {

  useEffect(() => {
    (async () => {
      try {
        const token = await registerForPushNotifications();
        console.log('[PUSH] Token acquired:', token);
      } catch (error) {
        console.log('[PUSH] Registration failed:', error);
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
