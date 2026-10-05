import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../auth/authContext";
import api from "../config/api";
import { FEATURE_FLAGS } from "../config/featureFlags";
import {
  createSetupModeCoordinator,
  selectOwnedPhoneSetupIntent,
  selectOwnedSetupReadiness,
} from "./setupModeContract";

export const SetupModeContext = createContext(null);

export function SetupModeProvider({ children }) {
  const { authenticated, barber } = useContext(AuthContext);
  const ownerId = barber?._id || barber?.id || null;
  const [, render] = useState(0);
  const coordinatorRef = useRef(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createSetupModeCoordinator({
      apiClient: api,
      clientEnabled: FEATURE_FLAGS.SETUP_MODE_FOUNDATION,
      onChange: () => render((value) => value + 1),
    });
  }
  const coordinator = coordinatorRef.current;

  useEffect(() => {
    coordinator.activateSession(authenticated, ownerId);
  }, [authenticated, coordinator, ownerId]);

  const snapshot = coordinator.snapshot();
  const { readinessState, phoneSetupIntentState, loading } = snapshot;
  const readiness = selectOwnedSetupReadiness(readinessState, ownerId);
  const phoneSetupIntentId = selectOwnedPhoneSetupIntent(phoneSetupIntentState, ownerId);
  const effectiveLoading = loading || Boolean(
    FEATURE_FLAGS.SETUP_MODE_FOUNDATION && authenticated && ownerId && !readiness
  );
  const value = useMemo(() => ({
    clientEnabled: FEATURE_FLAGS.SETUP_MODE_FOUNDATION,
    readiness,
    loading: effectiveLoading,
    phoneSetupIntentId,
    invalidateSession: coordinator.invalidateSession,
    refreshReadiness: coordinator.refreshReadiness,
    startPhoneSetup: coordinator.startPhoneSetup,
  }), [coordinator, effectiveLoading, phoneSetupIntentId, readiness]);

  return <SetupModeContext.Provider value={value}>{children}</SetupModeContext.Provider>;
}
