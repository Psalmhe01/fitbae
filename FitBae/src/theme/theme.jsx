import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { PairedWeights } from "@/components/FitBaeLoading";
import { palettes, paletteTokens, readPreference, writePreference } from "./palettes";

const ThemeContext = createContext({ colorScheme: "light", toggleColorScheme: () => {} });

const brand = [
  "#f6ffd9", "#edffad", "#e4ff7f", "#dcff5b", "#d7ff46",
  "#c8ef36", "#b5da29", "#91af1f", "#718a19", "#526612",
];

export function ThemeProvider({ children }) {
  const [palette, setPalette] = useState(() => {
    const stored = readPreference('fitbae-palette', 'green');
    return Object.hasOwn(palettes, stored) ? stored : 'green';
  });
  const [colorScheme, setColorScheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = readPreference("fitbae-color-scheme", "");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme;
    document.documentElement.style.colorScheme = colorScheme;
    writePreference("fitbae-color-scheme", colorScheme);
    if (Capacitor.isNativePlatform()) {
      SystemBars.setStyle({ style: colorScheme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
    }
  }, [colorScheme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    writePreference('fitbae-palette', palette);
    for (const [key, value] of Object.entries(paletteTokens(palette, colorScheme))) {
      if (palette === 'green') document.documentElement.style.removeProperty(key);
      else document.documentElement.style.setProperty(key, value);
    }
  }, [palette, colorScheme]);

  const value = useMemo(() => ({
    colorScheme,
    palette, setPalette, setColorScheme,
    toggleColorScheme: () => setColorScheme((current) => current === "dark" ? "light" : "dark"),
  }), [colorScheme, palette]);

  const theme = useMemo(() => createTheme({
    primaryColor: "brand",
    primaryShade: palette === 'green' ? 6 : { light: 8, dark: 4 },
    autoContrast: true,
    respectReducedMotion: true,
    luminanceThreshold: 0.32,
    colors: { brand: palette === 'green' ? brand : [97, 93, 88, 83, 78, 74, 70, 49, 36, 25].map((l) => `hsl(${palettes[palette].hue}, ${palettes[palette].saturation}%, ${l}%)`) },
    defaultRadius: "md",
    radius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "16px" },
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    headings: {
      fontFamily: '"Manrope", "Segoe UI", sans-serif',
      fontWeight: "650",
    },
    components: {
      Loader: { defaultProps: { children: <PairedWeights /> } },
      Button: {
        defaultProps: { radius: "md" },
        styles: { root: { fontWeight: 650, letterSpacing: "-0.01em" } },
      },
      Paper: { defaultProps: { radius: "lg" } },
      TextInput: {
        defaultProps: { radius: "md", size: "md" },
        styles: { input: { background: "var(--surface)", borderColor: "var(--line)" } },
      },
      Textarea: {
        defaultProps: { radius: "md", size: "md" },
        styles: { input: { background: "var(--surface)", borderColor: "var(--line)" } },
      },
      NumberInput: {
        defaultProps: { radius: "md", size: "md" },
        styles: { input: { background: "var(--surface)", borderColor: "var(--line)" } },
      },
      SegmentedControl: {
        defaultProps: { radius: "md" },
        styles: {
          root: { background: "var(--surface-muted)" },
          indicator: { background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow-xs)" },
        },
      },
      Modal: {
        defaultProps: { radius: "lg", centered: true, transitionProps: { transition: "fade-up", duration: 180, timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" } },
        styles: { content: { background: "var(--surface-raised)" }, header: { background: "var(--surface-raised)" } },
      },
      Drawer: {
        styles: { content: { background: "var(--surface-raised)" }, header: { background: "var(--surface-raised)" } },
      },
    },
  }), [palette]);

  return (
    <ThemeContext.Provider value={value}>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <Notifications position="top-right" zIndex={3000} />
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
