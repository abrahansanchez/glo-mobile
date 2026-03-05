import { useEffect, useState } from 'react';
import { View } from "react-native";
import { AuthProvider } from "./src/auth/authContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { VoiceProvider } from "./src/voice/VoiceContext";
import { setupForegroundPushLogging } from "./src/notifications/pushNotifications";
import { OnboardingProvider } from "./src/onboarding/OnboardingContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { CallManagerProvider, useCallManager } from "./src/voice/CallManager";
import IncomingCallOverlay from "./src/voice/IncomingCallOverlay";
import AnimatedSplashOverlay from "./src/components/AnimatedSplashOverlay";
import { ThemeProvider } from "./src/theme/ThemeContext";

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
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const teardown = setupForegroundPushLogging();
    return teardown;
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <CallManagerProvider>
          <VoiceProvider>
            <OnboardingProvider>
              <ErrorBoundary>
                <View style={{ flex: 1, backgroundColor: "#000000" }}>
                  <AppNavigator />
                  <IncomingCallOverlayContainer />
                  {!splashDone ? <AnimatedSplashOverlay onFinish={() => setSplashDone(true)} /> : null}
                </View>
              </ErrorBoundary>
            </OnboardingProvider>
          </VoiceProvider>
        </CallManagerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
