import { useState } from "react";
import { mockUser, weeklyPlan } from "@/lib/mock-data";
import {
  Stack,
  Paper,
  Title,
  Text,
  SimpleGrid,
  Group,
  Button,
  Badge,
  ScrollArea,
  Drawer,
  ThemeIcon,
  Box,
  rem,
  UnstyledButton,
} from "@mantine/core";
import { useTheme } from "@/lib/theme";
import { useDisclosure } from "@mantine/hooks";
import {
  RefreshCw,
  Calendar,
  Target,
  Award,
  Clock,
  Dumbbell,
  Coffee,
} from "lucide-react";

function Dashboard() {
  const accentFilled = "var(--mantine-color-primary-filled)";
  const [opened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const handleDayClick = (day) => {
    setSelectedDay(day);
    openDrawer();
  };

  return (
    <Stack gap="xl">
      {/* Welcome banner */}
      <Paper
        className="glass shadow-glow"
        radius="32px"
        p={{ base: "xl", md: 32 }}
      >
        <Title order={1} size="h2" fw={700}>
          Welcome back, {mockUser.name.split(" ")[0]}{" "}
          <span style={{ display: "inline-block" }}>👋</span>
        </Title>
        <Text c="dimmed" mt={4}>
          Here's your plan for this week.
        </Text>
      </Paper>

      {/* Stats row */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Stat
          icon={Calendar}
          label="Workout Days"
          value={`${mockUser.frequency}/week`}
        />
        <Stat icon={Target} label="Current Goal" value={mockUser.goal} />
        <Stat icon={Award} label="Experience" value={mockUser.experience} />
        <Stat
          icon={Clock}
          label="Last Generated"
          value={mockUser.lastGenerated}
        />
      </SimpleGrid>

      {/* Weekly plan */}
      <Paper className="glass" radius="32px" p={{ base: "xl", md: 24 }}>
        <Group justify="space-between" mb="xl">
          <div>
            <Title order={2} size="h4">
              This Week
            </Title>
            <Text c="dimmed" size="sm">
              Tap a day to see the full workout.
            </Text>
          </div>
          <Button
            variant="outline"
            radius="xl"
            leftSection={<RefreshCw size={16} />}
          >
            Regenerate
          </Button>
        </Group>

        <ScrollArea pb="md">
          <Group wrap="nowrap" gap="md" align="flex-start">
            {weeklyPlan.map((d) => (
              <UnstyledButton
                key={d.day}
                onClick={() => handleDayClick(d)}
                className="glass"
                style={{
                  minWidth: rem(180),
                  padding: rem(16),
                  borderRadius: rem(16),
                  opacity: d.rest ? 0.7 : 1,
                  justifySelf: "flex-start",
                }}
              >
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    {d.day.slice(0, 3)}
                  </Text>
                  <Badge
                    variant="light"
                    color={d.rest ? "gray" : "primary"}
                    radius="xl"
                    size="xs"
                  >
                    {d.rest ? "Rest" : "Active"}
                  </Badge>
                </Group>
                <Group gap="xs" mt="md">
                  {d.rest ? (
                    <Coffee size={16} color="var(--mantine-color-dimmed)" />
                  ) : (
                    <Dumbbell size={16} color={accentFilled} />
                  )}
                  <Text fw={700} size="md">
                    {d.type}
                  </Text>
                </Group>
                <Stack gap={6} mt="md">
                  {d.exercises.slice(0, 4).map((ex) => (
                    <Text key={ex.name} c="dimmed" size="xs" truncate="end">
                      • {ex.name}
                    </Text>
                  ))}
                  {d.exercises.length > 4 && (
                    <Text style={{ color: accentFilled }} size="xs" fw={500}>
                      +{d.exercises.length - 4} more
                    </Text>
                  )}
                  {d.rest && (
                    <Text c="dimmed" size="xs" fs="italic">
                      Recovery day
                    </Text>
                  )}
                </Stack>
              </UnstyledButton>
            ))}
          </Group>
        </ScrollArea>
      </Paper>

      {/* Detail Drawer */}
      <Drawer
        opened={opened}
        onClose={closeDrawer}
        position="right"
        size="md"
        title={selectedDay?.type}
        classNames={{ content: "glass-strong" }}
      >
        {selectedDay && (
          <Stack gap="lg">
            <Box>
              <Badge variant="light" mb="xs">
                {selectedDay.day}
              </Badge>
              <Title order={2} size="h3">
                {selectedDay.type}
              </Title>
              <Text c="dimmed" size="sm">
                {selectedDay.rest
                  ? "Take it easy — recovery is part of the plan."
                  : `${selectedDay.exercises.length} exercises · ~${mockUser.duration} min`}
              </Text>
            </Box>

            <Stack gap="md">
              {selectedDay.exercises.map((ex, i) => (
                <Paper key={ex.name} className="glass" p="md" radius="lg">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text c="dimmed" size="xs" ff="monospace">
                        {String(i + 1).padStart(2, "0")}
                      </Text>
                      <Text fw={700} size="md" mt={4}>
                        {ex.name}
                      </Text>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Text style={{ color: accentFilled }} fw={700} size="xl">
                        {ex.sets} × {ex.reps}
                      </Text>
                      <Text c="dimmed" size="xs">
                        rest {ex.rest}
                      </Text>
                    </div>
                  </Group>
                  {ex.note && (
                    <Box
                      mt="md"
                      pt="md"
                      style={{
                        borderTop: "1px solid var(--mantine-color-gray-2)",
                      }}
                    >
                      <Text c="dimmed" size="xs" fs="italic">
                        💡 {ex.note}
                      </Text>
                    </Box>
                  )}
                </Paper>
              ))}
              {selectedDay.rest && (
                <Paper className="glass" p="xl" radius="lg" ta="center">
                  <Coffee size={40} color="var(--mantine-color-dimmed)" />
                  <Text mt="md" size="sm">
                    Stretch, hydrate, and let your body adapt.
                  </Text>
                </Paper>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}

export default Dashboard;

function Stat({ icon: Icon, label, value }) {
  return (
    <Paper className="glass" p="md" radius="xl">
      <Group gap="xs">
        <ThemeIcon variant="light" size="md" radius="md">
          <Icon size={16} />
        </ThemeIcon>
        <Text c="dimmed" size="xs" fw={500}>
          {label}
        </Text>
      </Group>
      <Text size="lg" fw={700} mt="xs">
        {value}
      </Text>
    </Paper>
  );
}
