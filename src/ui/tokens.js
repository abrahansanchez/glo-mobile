export const lightColors = {
  bg: "#ffffff",
  surface: "#f9fafb",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  card: "#ffffff",
  accent: "#111827",
  success: "#065f46",
  warning: "#92400e",
  danger: "#b00020",
};

export const darkColors = {
  bg: "#0b0f14",
  surface: "#11161d",
  textPrimary: "#e5e7eb",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  border: "#1f2937",
  card: "#0f1720",
  accent: "#e5e7eb",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
};

export function getThemeColors(theme = "light") {
  return theme === "dark" ? darkColors : lightColors;
}

// Backward-compatible static export for legacy screens.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const type = {
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  section: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
};
