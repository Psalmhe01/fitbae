import { Link } from "react-router-dom";
import { weeklyPlan } from "@/lib/mock-data";
import { Dumbbell, Coffee } from "lucide-react";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  ThemeIcon,
  Divider,
  Anchor,
  Center,
  Box,
} from "@mantine/core";
import { useTheme } from "@/lib/theme";

export default function PlanPage() {
  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <Title order={1} size="h2" fw={700}>
          My Plan
        </Title>
        <Text c="dimmed">Your current 7-day program, in detail.</Text>
      </Stack>

      <Stack gap="md">
        {weeklyPlan.map((d) => (
          <Paper
            key={d.day}
            className="glass"
            radius="xl"
            p={{ base: "lg", md: "xl" }}
          >
            <Group justify="space-between" mb="lg">
              <Group gap="md">
                <ThemeIcon variant="light" size="lg" radius="md">
                  {d.rest ? <Coffee size={20} /> : <Dumbbell size={20} />}
                </ThemeIcon>
                <Stack gap={0}>
                  <Text
                    c="dimmed"
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {d.day}
                  </Text>
                  <Title order={3} size="h4">
                    {d.type}
                  </Title>
                </Stack>
              </Group>
              <Badge
                variant="light"
                color={d.rest ? "gray" : "primary"}
                radius="xl"
              >
                {d.rest ? "Rest" : "Active"}
              </Badge>
            </Group>

            {d.rest ? (
              <Text c="dimmed" size="sm">
                Recovery day — stretch and hydrate.
              </Text>
            ) : (
              <Stack gap={0}>
                {d.exercises.map((ex, index) => (
                  <Box key={ex.name}>
                    {index !== 0 && (
                      <Divider my="sm" variant="dashed" opacity={0.4} />
                    )}
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate="end">
                          {ex.name}
                        </Text>
                        <Text c="dimmed" size="xs">
                          rest {ex.rest}
                        </Text>
                      </Box>
                      <Text
                        size="sm"
                        fw={700}
                        style={{
                          color: "var(--mantine-color-primary-filled)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ex.sets} × {ex.reps}
                      </Text>
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>

      <Center>
        <Anchor component={Link} to="/dashboard" size="sm">
          ← Back to dashboard
        </Anchor>
      </Center>
    </Stack>
  );
}
