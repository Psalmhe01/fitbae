import { planHistory } from "@/lib/mock-data";
import {
  Stack,
  Title,
  Text,
  Paper,
  ThemeIcon,
  Badge,
  Button,
  Group,
  Box,
} from "@mantine/core";
import { FileText, Calendar, Sparkles } from "lucide-react";

export default function HistoryPage() {
  const empty = false;

  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} size="h2" fw={700}>
          History
        </Title>
        <Text c="dimmed" mt={4}>
          Every plan you've ever generated.
        </Text>
      </Box>

      {empty ? (
        <Paper className="glass" radius="32px" p={{ base: "xl", md: 48 }}>
          <Stack align="center" gap="md">
            <ThemeIcon variant="light" size={64} radius="xl">
              <Sparkles size={32} />
            </ThemeIcon>
            <Box ta="center">
              <Title order={3}>No plans yet</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Generate your first one!
              </Text>
            </Box>
            <Button radius="xl" size="md" mt="md">
              Generate Plan
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="sm">
          {planHistory.map((p) => (
            <Paper
              key={p.id}
              className="glass"
              radius="xl"
              p={{ base: "md", sm: "lg" }}
              style={{ transition: "transform 0.2s ease" }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group
                  align="center"
                  gap={{ base: "sm", sm: "md" }}
                  style={{ flex: 1, minWidth: 0 }}
                  wrap="nowrap"
                >
                  <ThemeIcon
                    variant="light"
                    size={{ base: 40, sm: 48 }}
                    radius="lg"
                    style={{ flexShrink: 0 }}
                  >
                    <FileText size={20} />
                  </ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" mb={2} wrap="nowrap">
                      <Badge
                        variant="light"
                        radius="xl"
                        size="xs"
                        style={{ flexShrink: 0 }}
                      >
                        {p.goal}
                      </Badge>
                      <Group gap={4} visibleFrom="xs" wrap="nowrap">
                        <Calendar
                          size={12}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text c="dimmed" size="xs" truncate>
                          {p.date}
                        </Text>
                      </Group>
                    </Group>
                    <Text size="sm" fw={500} truncate="end">
                      {p.summary}
                    </Text>
                    <Text c="dimmed" size="xs" hiddenFrom="xs" mt={2}>
                      {p.date}
                    </Text>
                  </Box>
                </Group>
                <Button
                  variant="outline"
                  radius="xl"
                  size="sm"
                  ml="xs"
                  style={{ flexShrink: 0 }}
                >
                  View
                </Button>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
