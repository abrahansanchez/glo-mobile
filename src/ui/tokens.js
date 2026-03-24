export const lightColors = {
  bg: "#070e17",
  surface: "#0d1821",
  card: "#0d1821",
  border: "rgba(255,255,255,0.07)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.45)",
  textMuted: "rgba(255,255,255,0.22)",
  accent: "rgba(0,210,220,0.85)",
  accentBorder: "rgba(0,210,220,0.25)",
  success: "rgba(0,210,140,0.85)",
  warning: "#fbbf24",
  danger: "#E24B4A",
};

export const darkColors = {
  bg: "#070e17",
  surface: "#0d1821",
  card: "#0d1821",
  border: "rgba(255,255,255,0.07)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.45)",
  textMuted: "rgba(255,255,255,0.22)",
  accent: "rgba(0,210,220,0.85)",
  accentBorder: "rgba(0,210,220,0.25)",
  success: "rgba(0,210,140,0.85)",
  warning: "#fbbf24",
  danger: "#E24B4A",
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
