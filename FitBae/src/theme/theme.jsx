import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

const ThemeContext = createContext({ colorScheme: "light", toggleColorScheme: () => {} });

const brand = [
  "#f6ffd9", "#edffad", "#e4ff7f", "#dcff5b", "#d7ff46",
  "#c8ef36", "#b5da29", "#91af1f", "#718a19", "#526612",
];

export function ThemeProvider({ children }) {
  const [colorScheme, setColorScheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("fitbae-color-scheme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme;
    document.documentElement.style.colorScheme = colorScheme;
    localStorage.setItem("fitbae-color-scheme", colorScheme);
  }, [colorScheme]);

  const value = useMemo(() => ({
    colorScheme,
    toggleColorScheme: () => setColorScheme((current) => current === "dark" ? "light" : "dark"),
  }), [colorScheme]);

  const theme = useMemo(() => createTheme({
    primaryColor: "brand",
    primaryShade: 6,
    autoContrast: true,
    luminanceThreshold: 0.32,
    colors: { brand },
    defaultRadius: "md",
    fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", Helvetica, Arial, sans-serif',
    headings: {
      fontFamily: '"Arial Narrow", "Aptos Display", "Segoe UI Variable Display", sans-serif',
      fontWeight: "760",
    },
    components: {
      Button: {
        defaultProps: { radius: "md" },
        styles: { root: { fontWeight: 720, letterSpacing: "-0.01em" } },
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
        defaultProps: { radius: "lg", centered: true },
        styles: { content: { background: "var(--surface-raised)" }, header: { background: "var(--surface-raised)" } },
      },
      Drawer: {
        styles: { content: { background: "var(--surface-raised)" }, header: { background: "var(--surface-raised)" } },
      },
    },
  }), []);

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
