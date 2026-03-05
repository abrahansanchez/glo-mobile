import { Platform } from "react-native";
import Constants from "expo-constants";
import api from "../config/api";

const MAX_QUEUE_SIZE = 50;
const eventQueue = [];

let runtimeContext = {};
let flushInFlight = false;

function generateSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now()}_${rand}`;
}

const SESSION_ID = generateSessionId();

function getAppVersion() {
  return (
    Constants?.expoConfig?.version ||
    Constants?.manifest2?.extra?.expoClient?.version ||
    Constants?.manifest?.version ||
    "unknown"
  );
}

function sanitizeProps(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeProps);
  }

  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((key) => {
      if (key === "barberId") return;
      out[key] = sanitizeProps(value[key]);
    });
    return out;
  }

  return value;
}

function enqueue(eventPayload) {
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }
  eventQueue.push(eventPayload);
}

async function flushQueue() {
  if (flushInFlight || eventQueue.length === 0) return;
  flushInFlight = true;

  try {
    while (eventQueue.length > 0) {
      const nextEvent = eventQueue[0];
      try {
        await api.post("/analytics/events", nextEvent);
        if (__DEV__) {
          console.log("[ANALYTICS][POST_OK]", nextEvent.eventName, {
            queued: eventQueue.length - 1,
            step: nextEvent.step || null,
          });
        }
        eventQueue.shift();
      } catch (error) {
        if (__DEV__) {
          console.warn(
            "[ANALYTICS][POST_FAIL] queued for retry",
            nextEvent.eventName,
            error?.response?.data?.message || error?.message || "unknown_error"
          );
        }
        break;
      }
    }
  } finally {
    flushInFlight = false;
  }
}

export function setAnalyticsContext(nextContext = {}) {
  runtimeContext = {
    ...runtimeContext,
    ...nextContext,
  };
}

export function track(eventName, props = {}) {
  if (!eventName) return;

  const sanitizedProps = sanitizeProps(props || {});
  const step = typeof sanitizedProps?.step === "string" ? sanitizedProps.step : undefined;

  if (step && typeof sanitizedProps === "object") {
    delete sanitizedProps.step;
  }

  const payload = {
    eventName,
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    platform: Platform.OS,
    appVersion: getAppVersion(),
    ...(step ? { step } : {}),
    props: {
      ...sanitizeProps(runtimeContext || {}),
      ...sanitizedProps,
    },
  };

  if (__DEV__) {
    console.log("[ANALYTICS]", eventName, payload);
  }

  enqueue(payload);
  flushQueue().catch(() => {
    if (__DEV__) {
      console.warn("[ANALYTICS][FLUSH_FAIL] unexpected flush failure");
    }
  });
}
