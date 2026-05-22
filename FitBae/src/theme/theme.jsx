import { createContext, useContext, useEffect, useState } from "react";
import { MantineProvider, createTheme, rem } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

const ThemeContext = createContext({
  accent: "blue",
  setAccent: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const [accent, setAccent] = useState("blue");

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("fitbae-accent")
        : null;
    if (stored === "blue" || stored === "purple") {
      setAccent(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-blue", "theme-purple");
    root.classList.add(accent === "purple" ? "theme-purple" : "theme-blue");
    localStorage.setItem("fitbae-accent", accent);
  }, [accent]);

  return (
    <ThemeContext.Provider
      value={{
        accent,
        setAccent,
        toggle: () =>
          setAccent((current) => (current === "blue" ? "purple" : "blue")),
      }}
    >
      <MantineProvider
        theme={createTheme({
          primaryColor: accent,
          colors: {
            purple: [
              "#f3f0ff",
              "#e5dbff",
              "#d0bfff",
              "#b197fc",
              "#9775fa",
              "#845ef7",
              "#7950f2", // Replaced var(--primary) with valid hex
              "#7048e8",
              "#6741d9",
              "#5f3dc4",
            ],
            blue: [
              "#e7f5ff",
              "#d0ebff",
              "#a5d8ff",
              "#74c0fc",
              "#4dabf7",
              "#339af0",
              "#228be6", // Replaced var(--primary) with valid hex
              "#1c7ed6",
              "#1971c2",
              "#1864ab",
            ],
          },
          primaryShade: 6,
          defaultRadius: "xl",
          fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
          headings: {
            fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
            fontWeight: "700",
          },
          components: {
            Paper: {
              defaultProps: {
                radius: "32px",
                withBorder: false,
              },
            },
            TextInput: {
              defaultProps: {
                radius: "md",
                size: "md",
              },
              styles: {
                input: {
                  backgroundColor: "rgba(0, 0, 0, 0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid var(--border)",
                  transition: "border-color 0.2s ease",
                },
              },
            },
            NumberInput: {
              defaultProps: {
                radius: "md",
                size: "md",
              },
              styles: {
                input: {
                  backgroundColor: "rgba(0, 0, 0, 0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid var(--border)",
                },
              },
            },
            SegmentedControl: {
              defaultProps: {
                color: accent,
                radius: "xl",
              },
              styles: {
                root: {
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid var(--border)",
                },
                indicator: {
                  boxShadow: "var(--shadow-glow)",
                },
              },
            },
            Slider: {
              defaultProps: {
                color: accent,
                size: "md",
                radius: "xl",
              },
              styles: {
                track: {
                  height: rem(6),
                  backgroundColor:
                    "color-mix(in oklab, var(--primary), transparent 80%)",
                },
                bar: {
                  backgroundColor: "var(--primary)",
                },
                thumb: {
                  height: rem(16),
                  width: rem(16),
                  backgroundColor: "var(--background)",
                  border:
                    "1px solid color-mix(in oklab, var(--primary), transparent 50%)",
                  boxShadow: "var(--shadow)",
                },
              },
            },
            Chip: {
              defaultProps: {
                color: accent,
                variant: "filled",
                radius: "xl",
              },
            },
            Button: {
              defaultProps: {
                radius: "xl",
              },
            },
          },
          other: {
            // This allows us to use these as variables if needed,
            // though keeping them in index.css is also fine.
          },
        })}
        forceColorScheme="dark"
      >
        <Notifications />
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
