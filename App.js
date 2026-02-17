import { useEffect } from 'react';
import { AuthProvider } from "./src/auth/authContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { VoiceProvider } from "./src/voice/VoiceContext";
import { registerForPushNotifications } from "./src/notifications/pushNotifications";
import { OnboardingProvider } from "./src/onboarding/OnboardingContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

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
      <VoiceProvider>
        <OnboardingProvider>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </OnboardingProvider>
      </VoiceProvider>
    </AuthProvider>
  );
}
