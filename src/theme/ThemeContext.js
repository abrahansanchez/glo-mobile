import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getThemeColors } from "../ui/tokens";

const THEME_KEY = "glo_theme_mode";

const ThemeContext = createContext({
  themeMode: "system",
  resolvedTheme: "light",
  colors: getThemeColors("light"),
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const resolvedTheme = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      colors: getThemeColors(resolvedTheme),
      setThemeMode: async (nextMode) => {
        const mode = nextMode === "light" || nextMode === "dark" || nextMode === "system" ? nextMode : "system";
        setThemeModeState(mode);
        await SecureStore.setItemAsync(THEME_KEY, mode);
      },
    }),
    [themeMode, resolvedTheme]
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
