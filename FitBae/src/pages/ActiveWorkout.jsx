import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { notifications } from "@mantine/notifications";
import { notifyRestComplete } from "@/lib/notifications";
import {
  Stack,
  Paper,
  Title,
  Text,
  Group,
  Button,
  ActionIcon,
  NumberInput,
  Progress,
  Box,
  rem,
  Modal,
  Divider,
  SimpleGrid,
  Image,
  ThemeIcon,
} from "@mantine/core";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { Check, Timer, X, Award, Flame, Clock, Info } from "lucide-react";

export default function ActiveWorkoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const workout = location.state?.workout;

  // Redirect if no workout is selected
  useEffect(() => {
    if (!workout) navigate("/dashboard");
  }, [workout, navigate]);

  // Workout State
  const [seconds, setSeconds] = useState(0);
  const [activeRest, setActiveRest] = useState(null); // Countdown timer
  const [logs, setLogs] = useState(() => {
    const initial = {};
    workout?.exercises?.forEach((ex) => { // Ensure workout is defined before accessing exercises
      for (let i = 0; i < ex.sets; i++) {
        const key = `${ex.name}-${i}`;
        initial[key] = { weight: ex.starting_weight_lbs || 0, done: false };
      }
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [summaryOpened, { open: openSummary, close: closeSummary }] = useDisclosure(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [imageModalOpened, { open: openImageModal, close: closeImageModal }] = useDisclosure(false);
  // Timer Logic
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rest Timer Logic
  useEffect(() => {
    let interval;
    if (activeRest > 0) {
      interval = setInterval(() => setActiveRest((r) => r - 1), 1000);
    } else if (activeRest === 0) {
      notifyRestComplete();
      setActiveRest(null);
    }
    return () => clearInterval(interval);
  }, [activeRest]);

  if (!workout) return null;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleSet = (exerciseName, setIndex, restTime) => {
    const key = `${exerciseName}-${setIndex}`;
    const isChecking = !logs[key]?.done;

    setLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: isChecking },
    }));

    if (
      isChecking &&
      (restTime ||
        workout.exercises.find((e) => e.name === exerciseName)?.rest_seconds)
    ) {
      const rawRest =
        restTime ||
        workout.exercises.find((e) => e.name === exerciseName)?.rest_seconds;
      const secondsCount =
        typeof rawRest === "string"
          ? parseInt(rawRest.replace(/[^0-9]/g, ""))
          : parseInt(rawRest);
      setActiveRest(secondsCount || 60);
    }
  };

  const updateWeight = (exerciseName, setIndex, weight) => {
    const key = `${exerciseName}-${setIndex}`;
    setLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], weight },
    }));
  };

  const totalSets = workout.exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const completedSets = Object.values(logs).filter((l) => l.done).length;
  const progress = (completedSets / totalSets) * 100;

  const calculateVolume = () => {
    return Object.values(logs).reduce((acc, curr) => {
      if (curr.done && curr.weight) return acc + curr.weight;
      return acc;
    }, 0);
  };

  const handleFinishWorkout = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    try {
      // 1. Create the session
      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: session.user.id,
          plan_id: location.state?.planId,
          day: workout.day,
          workout_type: workout.type,
          focus: workout.focus,
          duration_seconds: Math.floor(seconds),
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Log every set
      const logsToInsert = [];
      workout.exercises.forEach((ex) => {
        for (let i = 0; i < ex.sets; i++) {
          const key = `${ex.name}-${i}`;
          const log = logs[key];
          logsToInsert.push({
            session_id: sessionData.id,
            user_id: session.user.id,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            equipment_id: ex.equipment_id, // Store equipment_id from the generated plan
            set_number: i + 1,
            planned_reps: ex.reps,
            actual_reps: parseInt(ex.reps) || 0, // Fallback to start of range
            weight_lbs: log?.weight || 0,
            rest_seconds: ex.rest_seconds || 0,
            skipped: !log?.done,
          });
        }
      });

      const { error: logsError } = await supabase
        .from("exercise_logs")
        .insert(logsToInsert);
      if (logsError) throw logsError;

      openSummary();
    } catch (error) {
      console.error("Error saving workout:", error);
      notifications.show({
        title: "Save failed",
        message: error.message,
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg" pb={100}>
      <Paper
        className="glass-strong"
        p="md"
        radius="xl"
        style={{ position: "sticky", top: rem(80), zIndex: 90 }}
      >
        <Group justify="space-between" mb="xs">
          <Box>
            <Title order={3} size="h5">
              {workout.type}
            </Title>
            <Text size="xs" c="dimmed">
              {formatTime(seconds)} elapsed
            </Text>
          </Box>
          <Button
            variant="light"
            color="red"
            radius="xl"
            size="xs"
            onClick={() => navigate("/dashboard")}
            leftSection={<X size={14} />}
          >
            Quit
          </Button>
        </Group>
        <Progress
          value={progress}
          size="sm"
          radius="xl"
          color="primary"
          transitionDuration={300}
        />
      </Paper>

      {workout.exercises.map((ex) => (
        <Paper key={ex.name} className="glass" p="lg" radius="32px">
          <Group wrap="nowrap" mb="sm" align="flex-start">
            {ex.equipment_id && (
              <Image
                src={getEquipmentById(ex.equipment_id)?.image_url}
                alt={getEquipmentById(ex.equipment_id)?.name}
                w={48}
                h={48}
                fallbackSrc="https://placehold.co/48?text=Equip"
                style={{ objectFit: "contain", flexShrink: 0, cursor: "pointer" }}
                onClick={() => {
                  setSelectedExercise(ex); // Set the current exercise to display in the modal
                  openImageModal(); // Open the modal
                }}
              />
            )}
            <Group gap="xs" align="center" style={{ flex: 1 }}>
              <Title order={4}>{ex.name}</Title>
              <ActionIcon 
                size="sm"
                onClick={() => {
                  setSelectedExercise(ex);
                  openImageModal();
                }}
              >
                <Info size={16} />
              </ActionIcon>
            </Group>
          </Group>
          
          <Stack gap="xs">
            {Array.from({ length: ex.sets }).map((_, i) => {
              const key = `${ex.name}-${i}`;
              const isDone = logs[key]?.done;
              return (
                <Group key={i} justify="space-between" wrap="nowrap">
                  <Group gap="sm">
                    <Text size="sm" fw={700} w={24}>
                      S{i + 1}
                    </Text>
                    <NumberInput
                      placeholder="lbs"
                      size="xs"
                      w={80}
                      hideControls
                      value={logs[key]?.weight}
                      onChange={(v) => updateWeight(ex.name, i, v)}
                    />
                    <Text size="xs" c="dimmed">
                      {ex.reps} reps
                    </Text>
                  </Group>
                  <ActionIcon
                    variant={isDone ? "filled" : "light"}
                    color={isDone ? "green" : "primary"}
                    radius="xl"
                    size="lg"
                    onClick={() => toggleSet(ex.name, i, ex.rest_seconds)}
                  >
                    <Check size={18} />
                  </ActionIcon>
                </Group>
              );
            })}
          </Stack>
        </Paper>
      ))}

      <Box
        style={{
          position: "fixed",
          bottom: rem(20),
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: rem(400),
          padding: "0 20px",
          zIndex: 100,
        }}
      >
        <Stack gap="sm">
          {activeRest !== null && (
            <Paper
              className="glass-strong shadow-glow"
              p="sm"
              radius="xl"
              style={{
                border: "2px solid var(--mantine-color-primary-filled)",
              }}
            >
              <Group justify="center" gap="xs">
                <Timer size={16} className="animate-pulse" />
                <Text fw={700}>Resting: {activeRest}s</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setActiveRest(null)}
                >
                  Skip
                </Button>
              </Group>
            </Paper>
          )}
          <Button
            size="lg"
            radius="xl"
            fullWidth
            className="shadow-glow"
            loading={saving}
            disabled={completedSets === 0 || saving}
            onClick={handleFinishWorkout}
          >
            Finish Workout
          </Button>
        </Stack>
      </Box>

      <Modal
        opened={summaryOpened}
        onClose={() => navigate("/dashboard")}
        title="Workout Summary"
        centered
        radius="32px"
        classNames={{ content: "glass-strong" }}
        withCloseButton={false}
      >
        <Stack align="center" py="xl">
          <ThemeIcon size={80} radius="xl" variant="light" color="primary">
            <Award size={40} />
          </ThemeIcon>
          <Title order={2}>Workout Complete!</Title>
          <Text c="dimmed" ta="center">
            You're getting stronger every day.
          </Text>

          <Divider w="100%" my="lg" />

          <SimpleGrid cols={3} w="100%">
            <Stack gap={0} align="center">
              <Clock size={20} color="var(--mantine-color-dimmed)" />
              <Text fw={700} size="md">
                {Math.floor(seconds / 60) > 0
                  ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
                  : `${seconds}s`}
              </Text>
              <Text size="xs" c="dimmed">
                Minutes
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Flame size={20} color="var(--mantine-color-dimmed)" />
              <Text fw={700} size="xl">
                {calculateVolume()}
              </Text>
              <Text size="xs" c="dimmed">
                Lbs Lifted
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Check size={20} color="var(--mantine-color-dimmed)" />
              <Text fw={700} size="xl">
                {completedSets}
              </Text>
              <Text size="xs" c="dimmed">
                Sets Done
              </Text>
            </Stack>
          </SimpleGrid>

          <Button
            fullWidth
            radius="xl"
            size="md"
            mt="xl"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={imageModalOpened}
        onClose={closeImageModal}
        title={selectedExercise?.name}
        centered
        radius="32px"
        size={useMediaQuery('(max-width: 768px)') ? 'md' : 'lg'} // Adjust size for mobile
        classNames={{ content: "glass-strong" }}
      >
        {selectedExercise && (
          <Stack>
            {selectedExercise.equipment_id && (
              <Image
                src={getEquipmentById(selectedExercise.equipment_id)?.image_url}
                alt={selectedExercise.name}
                radius="lg"
                fit="contain"
                w="100%"
                h={200}
              />
            )}
            <Box>
         <Text fw={700} mb="xs">Instructions</Text>
              <Stack gap="xs">
                {selectedExercise.instructions?.map((step, idx) => (
                  <Text key={idx} size="sm">
                    {idx + 1}. {step}
                  </Text>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
