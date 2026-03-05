import { useContext } from "react";
import { AuthContext } from "./authContext";

export const ADMIN_BARBER_IDS = ["69a9facb47d1929c98133ea9"];

export function isAdminBarber(barber) {
  if (!barber || typeof barber !== "object") return false;

  if (barber.isAdmin === true) return true;
  if (String(barber.role || "").toLowerCase() === "admin") return true;

  const barberId = barber?.id || barber?._id;
  if (!barberId) return false;
  return ADMIN_BARBER_IDS.includes(String(barberId));
}

export function useIsAdmin() {
  const { barber } = useContext(AuthContext);
  return isAdminBarber(barber);
}
