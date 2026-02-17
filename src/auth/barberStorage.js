import * as SecureStore from "expo-secure-store";

const KEY = "glo_barber";

export async function saveBarber(barber) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(barber));
  } catch (e) {
    // ignore
  }
}

export async function getBarber() {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

export async function clearBarber() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch (e) {
    // ignore
  }
}
