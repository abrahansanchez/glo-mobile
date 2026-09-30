import api from "../config/api";
import { getBarber } from "../auth/barberStorage";

function resolvePreferredLanguage(barber) {
  const raw =
    barber?.preferredLanguage ||
    barber?.languagePreference ||
    barber?.language ||
    barber?.locale ||
    "";
  const normalized = String(raw).toLowerCase().trim();
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("en")) return "en";
  return null;
}

export async function fetchVoiceToken() {
  try {
    console.log("[VOICE] fetching token from /voice/token");
    const barber = await getBarber();
    const preferredLanguage = resolvePreferredLanguage(barber);
    console.log("[VOICE] about to call api.get /voice/token");
    const res = await api.get("/voice/token", {
      params: preferredLanguage ? { language: preferredLanguage } : undefined,
      headers: preferredLanguage ? { "X-Barber-Language": preferredLanguage } : undefined,
    });
    console.log("[VOICE] api.get /voice/token returned", res?.status);
    const data = res?.data || {};

    const token = data.token || data.accessToken || null;
    const identity = data.identity || data.user || null;

    if (!token) {
      console.log("[VOICE] token response missing required token");
      throw new Error("Voice token missing from server response");
    }

    if (preferredLanguage) {
      console.log("[VOICE] language lock hint sent", { preferredLanguage });
    }

    return { token, identity };
  } catch (err) {
    console.log("[VOICE] ❌ fetchVoiceToken threw", err?.message || err);
    throw err;
  }
}
