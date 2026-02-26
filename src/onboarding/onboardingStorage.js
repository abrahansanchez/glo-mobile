import * as SecureStore from "expo-secure-store";

const BASE_COMPLETE = "glo_onboarding_complete";
const BASE_STEP = "glo_onboarding_step";
const BASE_DATA = "glo_onboarding_data";

function keyFor(base, barberId) {
  return `${base}_${barberId}`;
}

export async function isComplete(barberId) {
  if (!barberId) return false;
  const v = await SecureStore.getItemAsync(keyFor(BASE_COMPLETE, barberId));
  return v === "true";
}

export async function markComplete(barberId, value = true) {
  if (!barberId) return;
  await SecureStore.setItemAsync(keyFor(BASE_COMPLETE, barberId), value ? "true" : "false");
}

export async function getStoredStep(barberId) {
  if (!barberId) return "WELCOME";
  return (await SecureStore.getItemAsync(keyFor(BASE_STEP, barberId))) || "WELCOME";
}

export async function setStoredStep(barberId, step) {
  if (!barberId) return;
  await SecureStore.setItemAsync(keyFor(BASE_STEP, barberId), step);
}

export async function getOnboardingData(barberId) {
  if (!barberId) return {};
  const data = await SecureStore.getItemAsync(keyFor(BASE_DATA, barberId));
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (error) {
    console.log("[ONBOARDING_STORAGE] invalid onboarding data JSON, resetting cache");
    return {};
  }
}

export async function setOnboardingData(barberId, data) {
  if (!barberId) return;
  await SecureStore.setItemAsync(keyFor(BASE_DATA, barberId), JSON.stringify(data));
}

export async function resetOnboarding(barberId) {
  if (!barberId) return;
  await SecureStore.deleteItemAsync(keyFor(BASE_COMPLETE, barberId));
  await SecureStore.deleteItemAsync(keyFor(BASE_STEP, barberId));
  await SecureStore.deleteItemAsync(keyFor(BASE_DATA, barberId));
}
