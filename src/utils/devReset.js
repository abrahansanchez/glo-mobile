import * as SecureStore from "expo-secure-store";

/**
 * Development utility to completely reset app state for testing.
 * Clears all auth, barber, onboarding, and subscription state.
 */
export async function resetAppState({ barberId } = {}) {
  try {
    console.log("[DevReset] Wiping app state...");

    // Clear auth tokens
    await SecureStore.deleteItemAsync("glo_auth_token");

    // Clear barber data
    await SecureStore.deleteItemAsync("glo_barber");

    // Clear onboarding state (for current barber if available)
    if (barberId) {
      await SecureStore.deleteItemAsync(`glo_onboarding_complete_${barberId}`);
      await SecureStore.deleteItemAsync(`glo_onboarding_step_${barberId}`);
      await SecureStore.deleteItemAsync(`glo_onboarding_data_${barberId}`);
    }

    // Clean up any accidental null keys that may have been written
    await SecureStore.deleteItemAsync("glo_onboarding_complete_null");
    await SecureStore.deleteItemAsync("glo_onboarding_step_null");
    await SecureStore.deleteItemAsync("glo_onboarding_data_null");

    console.log("[DevReset] App state wiped successfully. Please restart the app.");
  } catch (e) {
    console.error("[DevReset] Error during reset:", e);
  }
}
