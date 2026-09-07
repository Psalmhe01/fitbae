import { ActionIcon, Tooltip } from "@mantine/core";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/theme/theme";

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useTheme();
  const dark = colorScheme === "dark";
  return (
    <Tooltip label={`Use ${dark ? "light" : "dark"} theme`}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size={44}
        radius="md"
        onClick={toggleColorScheme}
        aria-label={`Use ${dark ? "light" : "dark"} theme`}
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </ActionIcon>
    </Tooltip>
  );
}
