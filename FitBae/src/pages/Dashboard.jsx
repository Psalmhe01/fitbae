import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { notifications } from "@mantine/notifications";
import { generateWorkoutPlan } from "@/lib/gemini";
import {
  Stack,
  Paper,
  Title,
  Text,
  SimpleGrid,
  Group,
  Button,
  Badge,
  Progress,
  ScrollArea,
  Drawer,
  ThemeIcon,
  Box,
  rem,
  UnstyledButton,
  Loader,
  Image,
} from "@mantine/core";
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
import { getEquipmentById } from "@/lib/equipmentLibrary";

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [opened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return navigate("/");

      const [profileRes, planRes, logsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single(),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("workout_sessions")
          .select("*", { count: 'exact' })
          .eq("user_id", session.user.id)
          .eq("status", "completed")
          .gte("finished_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (planRes.data) {
        setPlan(planRes.data.plan_json.weekly_schedule || []);
        setCompletedCount(logsRes.count || 0);
        setPlanId(planRes.data.id);
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const accentFilled = "var(--mantine-color-primary-filled)";
  
  const totalWorkouts = plan.filter(d => !d.rest).length;
  const progressValue = totalWorkouts > 0 ? (completedCount / totalWorkouts) * 100 : 0;

  if (loading) {
    return (
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Loader size="xl" />
      </Box>
    );
  }

  if (!profile) return null;

  const handleDayClick = (day) => {
    setSelectedDay(day);
    openDrawer();
  };

  const handleRegenerate = async () => {
    if (!profile) return;
    setRegenerating(true);
    try {
      const planJson = await generateWorkoutPlan(profile);

      const { error } = await supabase.from("workout_plans").insert({
        user_id: profile.user_id,
        plan_json: planJson,
        fitness_goal: profile.fitness_goal,
        experience_level: profile.experience_level,
      });

      if (error) throw error;

      setPlan(planJson.weekly_schedule || []);
      notifications.show({
        title: "Plan updated",
        message: "Your new workout plan has been generated!",
        color: "green",
      });
    } catch (error) {
      console.error("Error regenerating plan:", error);
      notifications.show({
        title: "Regeneration failed",
        message: "Failed to generate a new plan. Please try again.",
        color: "red",
      });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Stack gap="xl">
      {/* Welcome banner */}
      <Paper
        className="glass shadow-glow"
        radius="32px"
        p={{ base: "xl", md: 32 }}
      >
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={1} size="h2" fw={700}>
              Welcome back, {profile.name.split(" ")[0]}{" "}
              <span style={{ display: "inline-block" }}>👋</span>
            </Title>
            <Text c="dimmed" mt={4}>
              Here's your plan for this week.
            </Text>
          </Box>
          <Box style={{ textAlign: 'right', minWidth: rem(200) }}>
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={700}>WEEKLY PROGRESS</Text>
              <Text size="xs" c="dimmed">{completedCount}/{totalWorkouts} Workouts</Text>
            </Group>
            <Progress 
              value={progressValue} 
              size="sm" 
              radius="xl" 
              classNames={{ section: "shadow-glow" }}
            />
          </Box>
        </Group>
      </Paper>

      {/* Stats row */}
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Stat
          icon={Calendar}
          label="Workout Days"
          value={`${profile.gym_frequency}/week`}
        />
        <Stat icon={Target} label="Current Goal" value={profile.fitness_goal.toUpperCase()} />
        <Stat
          icon={Award}
          label="Experience"
          value={profile.experience_level.toUpperCase()}
        />
        <Stat
          icon={Clock}
          label="Duration"
          value={`${profile.workout_duration}m`}
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
            onClick={handleRegenerate}
            loading={regenerating}
          >
            Regenerate
          </Button>
        </Group>

        <ScrollArea pb="md">
          <Group wrap="nowrap" gap="md" align="flex-start">
            {plan
              .filter((d) => !d.rest)
              .map((d) => (
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
                      <Group key={ex.name} gap={6} wrap="nowrap">
                        {ex.equipment_id && (
                          <Image
                            src={getEquipmentById(ex.equipment_id)?.image_url}
                            w={14}
                            h={14}
                            fit="contain"
                            fallbackSrc="https://placehold.co/14?text=?"
                          />
                        )}
                        <Text c="dimmed" size="xs" truncate="end">
                          {!ex.equipment_id && "• "}{ex.name}
                        </Text>
                      </Group>
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
                  : `${selectedDay.exercises.length} exercises · ~${profile.workout_duration} min`}
              </Text>
            </Box>

            <Stack gap="md">
              {selectedDay.exercises.map((ex, i) => (
                <Paper key={ex.name} className="glass" p="md" radius="lg">
                  <Group justify="space-between" align="flex-start">
                    <Group align="center" gap="md">
                      {ex.equipment_id && (
                        <Image
                          src={getEquipmentById(ex.equipment_id)?.image_url}
                          alt={getEquipmentById(ex.equipment_id)?.name}
                          w={40}
                          h={40}
                          fit="contain"
                          fallbackSrc="https://placehold.co/40?text=?"
                        />
                      )}
                      <Box>
                        <Text c="dimmed" size="xs" ff="monospace">
                          {String(i + 1).padStart(2, "0")}
                        </Text>
                      <Text fw={700} size="md" mt={4}>
                        {ex.name}
                      </Text>
                      {ex.muscle_group && (
                        <Badge variant="dot" size="xs" mt={4}>
                          {ex.muscle_group}
                        </Badge>
                      )}
                      </Box>
                    </Group>
                    {ex.instructions && ex.instructions.length > 0 && (
                      <Box mt="md">
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Instructions</Text>
                        <Stack gap={4}>
                          {ex.instructions.map((step, idx) => (
                            <Text key={idx} size="xs" lh={1.4}>
                              {idx + 1}. {step}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <Text style={{ color: accentFilled }} fw={700} size="xl">
                        {ex.sets} × {ex.reps}
                      </Text>
                      <Text c="dimmed" size="xs">
                        rest {ex.rest_seconds}s
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
            {!selectedDay.rest && (
              <Button
                fullWidth
                size="lg"
                radius="xl"
                onClick={() =>
                  navigate("/workout", {
                    state: { workout: selectedDay, planId: planId },
                  })
                }
              >
                Start Workout
              </Button>
            )}
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
