import api from "../config/api";

export async function fetchVoiceToken() {
  console.log("[VOICE] fetching token from /voice/token");
  const res = await api.get("/voice/token");
  const data = res?.data || {};

  const token = data.token || data.accessToken || null;
  const identity = data.identity || data.user || null;

  if (!token) {
    console.log("[VOICE] missing token in response", data);
    throw new Error("Voice token missing from server response");
  }

  return { token, identity };
}
