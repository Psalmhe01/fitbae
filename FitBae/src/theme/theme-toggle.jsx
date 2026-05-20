import { useTheme } from "@/lib/theme";
import { Button } from "@mantine/core";
import { Palette } from "lucide-react";

export function ThemeToggle() {
  const { accent, toggle } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      radius="xl"
      onClick={toggle}
      leftSection={<Palette size={16} />}
      className="glass"
      style={{ minWidth: 104 }}
    >
      <span style={{ textTransform: "capitalize" }}>{accent}</span>
    </Button>
  );
}
