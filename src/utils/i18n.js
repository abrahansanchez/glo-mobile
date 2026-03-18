export const strings = {
  en: {
    chooseLanguage: "Choose your language",
    languageSubtitle: "This sets your app language now and helps Glō speak to you clearly later.",
    english: "English",
    spanish: "Español",
    saving: "Saving...",
    welcomeTitle: "Welcome to Glō",
    welcomeSubtitle: "Your AI receptionist handles calls, books appointments, and keeps your business responsive.",
    welcomeBulletOne: "No missed calls while you work.",
    welcomeBulletTwo: "Clients can book, cancel, and reschedule automatically.",
    welcomeBulletThree: "Always-on coverage, including after hours.",
    getStarted: "Get Started",
    callForwarding: "Call Forwarding",
    enableForwarding: "Enable Forwarding",
    disableForwarding: "Disable Forwarding",
    statusOn: "Status: ON",
    statusOff: "Status: OFF",
    carrier: "Carrier",
    routingNumber: "Routing Number",
    forwardingHint: "After enabling, call your number to confirm it's working.",
    enableForwardingTitle: "Enable Call Forwarding",
    enableForwardingMessage: "We will now open your dialer to activate forwarding.",
    disableForwardingTitle: "Disable Call Forwarding",
    disableForwardingMessage: "We will now open your dialer to disable forwarding.",
    continue: "Continue",
  },
  es: {
    chooseLanguage: "Elige tu idioma",
    languageSubtitle: "Esto cambia el idioma de la app ahora y ayuda a Glō a hablar contigo con claridad después.",
    english: "English",
    spanish: "Español",
    saving: "Guardando...",
    welcomeTitle: "Bienvenido a Glō",
    welcomeSubtitle: "Tu recepcionista con IA atiende llamadas, agenda citas y mantiene tu negocio siempre disponible.",
    welcomeBulletOne: "No más llamadas perdidas mientras trabajas.",
    welcomeBulletTwo: "Tus clientes pueden reservar, cancelar y reprogramar automáticamente.",
    welcomeBulletThree: "Cobertura continua, incluso fuera de horario.",
    getStarted: "Comenzar",
    callForwarding: "Desvío de llamadas",
    enableForwarding: "Activar desvío",
    disableForwarding: "Desactivar desvío",
    statusOn: "Estado: ACTIVO",
    statusOff: "Estado: INACTIVO",
    carrier: "Operador",
    routingNumber: "Número de destino",
    forwardingHint: "Después de activarlo, llama a tu número para confirmar que funciona.",
    enableForwardingTitle: "Activar desvío de llamadas",
    enableForwardingMessage: "Ahora abriremos tu marcador para activar el desvío.",
    disableForwardingTitle: "Desactivar desvío de llamadas",
    disableForwardingMessage: "Ahora abriremos tu marcador para desactivar el desvío.",
    continue: "Continuar",
  },
};

export function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("es")) return "es";
  return normalized === "en" ? "en" : "en";
}

export function getStrings(language) {
  return strings[normalizeLanguage(language)] || strings.en;
}
