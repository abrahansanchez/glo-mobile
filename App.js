import { useEffect } from 'react';
import { View } from "react-native";
import { AuthProvider } from "./src/auth/authContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { VoiceProvider } from "./src/voice/VoiceContext";
import { registerForPushNotifications } from "./src/notifications/pushNotifications";
import { OnboardingProvider } from "./src/onboarding/OnboardingContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { CallManagerProvider, useCallManager } from "./src/voice/CallManager";
import IncomingCallOverlay from "./src/voice/IncomingCallOverlay";

function IncomingCallOverlayContainer() {
  const { incomingInvite, actionInProgress, answerIncomingCall, letAiHandleIncomingCall } = useCallManager();

  return (
    <IncomingCallOverlay
      visible={!!incomingInvite}
      invite={incomingInvite}
      actionInProgress={actionInProgress}
      onAnswer={answerIncomingCall}
      onLetAiHandle={letAiHandleIncomingCall}
    />
  );
}

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
      <CallManagerProvider>
        <VoiceProvider>
          <OnboardingProvider>
            <ErrorBoundary>
              <View style={{ flex: 1 }}>
                <AppNavigator />
                <IncomingCallOverlayContainer />
              </View>
            </ErrorBoundary>
          </OnboardingProvider>
        </VoiceProvider>
      </CallManagerProvider>
    </AuthProvider>
  );
}
