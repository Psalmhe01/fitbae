import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  ActionIcon, Alert, Badge, Box, Button, Divider, Group, Modal,
  NumberInput, Paper, Progress, SimpleGrid, Stack, Text, Textarea,
  ThemeIcon, Title, Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, CircleMinus, Clock3, Dumbbell, Info, Minus, Pause,
  Plus, RefreshCw, Timer, X,
} from "lucide-react";
import { isMissingDatabaseFunction, supabase } from "@/lib/supabase";
import { notifyRestComplete } from "@/lib/notifications";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import { substitutePlanExercise } from "@/lib/workoutPlan";
import { ExerciseGuideModal } from "@/components/ExerciseGuideModal";
import { ExerciseSwapModal } from "@/components/ExerciseSwapModal";

const DRAFT_KEY = "fitbae-active-workout";

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(16));
  if (!bytes) throw new Error("This browser cannot create a secure workout identifier.");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function readDraft(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY));
    return value?.userId === userId && value?.workout ? value : null;
  } catch {
    return null;
  }
}

function targetReps(reps) {
  const match = String(reps || "").match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

function exerciseMetric(exercise = {}) {
  const prescription = exercise.prescription || {};
  const kind = prescription.kind || "reps";
  const unit = prescription.unit || (kind === "reps" ? "reps" : "units");
  const labels = {
    reps: "Reps",
    seconds: "Seconds",
    minutes: "Minutes",
    meters: "Meters",
    kilometers: "Kilometers",
    miles: "Miles",
  };
  const prescribedTarget = Number(prescription.min ?? prescription.max);
  return {
    kind,
    unit,
    label: labels[unit] || (kind === "distance" ? "Distance" : kind === "duration" || kind === "interval" ? "Time" : "Reps"),
    target: Number.isFinite(prescribedTarget) && prescribedTarget > 0
      ? prescribedTarget
      : targetReps(exercise.reps),
  };
}

function calculateRepVolume(exercises, logs) {
  return (exercises || []).reduce((total, exercise, exerciseIndex) => {
    if (exerciseMetric(exercise).kind !== "reps") return total;
    const setCount = Math.max(1, Number(exercise.sets) || 1);
    return total + Array.from({ length: setCount }, (_, setIndex) => {
      const entry = logs[slotKey(exercise, exerciseIndex, setIndex)];
      return entry?.done
        ? (Number(entry.weight) || 0) * (Number(entry.reps) || 0)
        : 0;
    }).reduce((sum, value) => sum + value, 0);
  }, 0);
}

function slotKey(exercise, exerciseIndex, setIndex) {
  return `${exercise.slot_id || exercise.id || `exercise-${exerciseIndex}`}-set-${setIndex + 1}`;
}

function createLogs(workout, savedLogs) {
  const result = {};
  (workout?.exercises || []).forEach((exercise, exerciseIndex) => {
    const sets = Math.max(1, Number(exercise.sets) || 1);
    for (let setIndex = 0; setIndex < sets; setIndex += 1) {
      const key = slotKey(exercise, exerciseIndex, setIndex);
      result[key] = savedLogs?.[key] || {
        weight: Math.max(0, Number(exercise.starting_weight_lbs) || 0),
        reps: exerciseMetric(exercise).target,
        done: false,
        skipped: false,
      };
    }
  });
  return result;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function ActiveWorkoutPage() {
  const { profile, session } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const incomingWorkout = location.state?.workout;
  const stored = incomingWorkout ? null : readDraft(session?.user?.id);
  const [workout, setWorkout] = useState(incomingWorkout || stored?.workout || null);
  const [planId] = useState(location.state?.planId || stored?.planId || null);
  const [idempotencyKey] = useState(() => stored?.idempotencyKey || createIdempotencyKey());
  const [logs, setLogs] = useState(() => createLogs(incomingWorkout || stored?.workout, stored?.logs));
  const [startedAt] = useState(() => {
    if (incomingWorkout) return Date.now();
    if (stored?.paused && Number.isFinite(Number(stored.elapsedSeconds))) {
      return Date.now() - Number(stored.elapsedSeconds) * 1000;
    }
    return stored?.startedAt || Date.now();
  });
  const [now, setNow] = useState(Date.now());
  const [activeIndex, setActiveIndex] = useState(stored?.activeIndex || 0);
  const [restEndsAt, setRestEndsAt] = useState(stored?.restEndsAt || null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notes, setNotes] = useState(stored?.notes || "");
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const restAlerted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!workout) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (finished) return;
    const completedSets = Object.values(logs).filter((item) => item.done).length;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      userId: session?.user?.id,
      planId,
      idempotencyKey,
      workout,
      logs,
      startedAt,
      activeIndex,
      restEndsAt,
      notes,
      completedSets,
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      paused: false,
      updatedAt: Date.now(),
    }));
  }, [activeIndex, finished, idempotencyKey, logs, notes, planId, restEndsAt, session?.user?.id, startedAt, workout, navigate]);

  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : null;
  useEffect(() => {
    if (!restEndsAt || restRemaining > 0 || restAlerted.current) return;
    restAlerted.current = true;
    notifyRestComplete();
    setRestEndsAt(null);
  }, [restEndsAt, restRemaining]);

  useEffect(() => {
    if (restEndsAt) restAlerted.current = false;
  }, [restEndsAt]);

  if (!workout) return null;

  const exercises = workout.exercises || [];
  const currentExercise = exercises[Math.min(activeIndex, Math.max(0, exercises.length - 1))];
  const currentMetric = exerciseMetric(currentExercise);
  const allLogEntries = Object.values(logs);
  const totalSets = allLogEntries.length;
  const completedSets = allLogEntries.filter((item) => item.done).length;
  const skippedSets = allLogEntries.filter((item) => item.skipped).length;
  const handledSets = completedSets + skippedSets;
  const progress = totalSets ? Math.min(100, (handledSets / totalSets) * 100) : 0;
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const volume = calculateRepVolume(exercises, logs);

  const updateSet = (exercise, exerciseIndex, setIndex, changes) => {
    const key = slotKey(exercise, exerciseIndex, setIndex);
    setLogs((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
  };

  const completeSet = (exercise, exerciseIndex, setIndex) => {
    const key = slotKey(exercise, exerciseIndex, setIndex);
    const current = logs[key];
    if (!current?.done && (!Number.isFinite(Number(current?.reps)) || Number(current.reps) <= 0)) {
      const metric = exerciseMetric(exercise);
      notifications.show({ title: `Add the ${metric.label.toLowerCase()} you completed`, message: "Enter the amount you actually completed before marking this set done.", color: "orange" });
      return;
    }
    const nextDone = !current?.done;
    updateSet(exercise, exerciseIndex, setIndex, { done: nextDone, skipped: false });
    if (nextDone && Number(exercise.rest_seconds) > 0) {
      setRestEndsAt(Date.now() + Number(exercise.rest_seconds) * 1000);
    }
  };

  const skipSet = (exercise, exerciseIndex, setIndex) => {
    const key = slotKey(exercise, exerciseIndex, setIndex);
    const nextSkipped = !logs[key]?.skipped;
    updateSet(exercise, exerciseIndex, setIndex, { skipped: nextSkipped, done: false });
  };

  const adjustRest = (seconds) => {
    setRestEndsAt((current) => Math.max(Date.now(), (current || Date.now()) + seconds * 1000));
  };

  const handleSwap = async (replacement) => {
    const wrapper = { weekly_schedule: [workout] };
    const next = substitutePlanExercise(wrapper, {
      dayId: workout.day_id || workout.id || workout.day,
      slotId: currentExercise.slot_id || currentExercise.id || currentExercise.exercise_id,
      replacement,
      preservePrescription: true,
    });
    const updated = next.weekly_schedule[0];
    setWorkout(updated);
    setLogs((current) => createLogs(updated, current));
    notifications.show({ title: `${replacement.name} is in`, message: "This swap applies to the active session only.", color: "green" });
    return true;
  };

  const discardWorkout = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFinished(true);
    navigate("/dashboard", { replace: true });
  };

  const pauseWorkout = () => {
    const completed = Object.values(logs).filter((item) => item.done).length;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      userId: session.user.id,
      planId,
      idempotencyKey,
      workout,
      logs,
      startedAt,
      activeIndex,
      restEndsAt: null,
      notes,
      completedSets: completed,
      elapsedSeconds,
      paused: true,
      updatedAt: Date.now(),
    }));
    navigate("/dashboard");
  };

  const saveWorkout = async () => {
    if (saving) return;
    setSaving(true);
    let createdSessionId = null;
    try {
      const sessionPayload = {
        plan_id: planId,
        day: workout.day,
        workout_type: workout.type,
        focus: workout.focus,
        duration_seconds: elapsedSeconds,
        notes: notes.trim() || null,
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date().toISOString(),
      };

      const records = [];
      exercises.forEach((exercise, exerciseIndex) => {
        const setCount = Math.max(1, Number(exercise.sets) || 1);
        const metric = exerciseMetric(exercise);
        for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
          const log = logs[slotKey(exercise, exerciseIndex, setIndex)];
          const completedValue = log?.done ? Math.max(0, Number(log.reps) || 0) : 0;
          records.push({
            exercise_name: exercise.name,
            muscle_group: exercise.muscle_group,
            equipment_id: exercise.equipment_id,
            set_number: setIndex + 1,
            planned_reps: exercise.reps,
            actual_reps: metric.kind === "reps" ? completedValue : 0,
            actual_value: completedValue,
            actual_unit: metric.unit,
            weight_lbs: log?.done ? Math.max(0, Number(log.weight) || 0) : 0,
            rest_seconds: Number(exercise.rest_seconds) || 0,
            skipped: !log?.done,
          });
        }
      });

      const { error: finalizeError } = await supabase.rpc("finalize_workout", {
        p_session: sessionPayload,
        p_logs: records,
        p_idempotency_key: idempotencyKey,
      });

      if (finalizeError) {
        if (!isMissingDatabaseFunction(finalizeError, "finalize_workout")) throw finalizeError;

        // Compatibility path for projects that have not applied the migration yet.
        const { data: sessionData, error: sessionError } = await supabase.from("workout_sessions").insert({
          ...sessionPayload,
          user_id: session.user.id,
          status: "completed",
        }).select().single();
        if (sessionError) throw sessionError;
        createdSessionId = sessionData.id;

        const { error: logsError } = await supabase.from("exercise_logs").insert(records.map((record) => ({
          exercise_name: record.exercise_name,
          muscle_group: record.muscle_group,
          equipment_id: record.equipment_id,
          set_number: record.set_number,
          planned_reps: record.planned_reps,
          actual_reps: record.actual_unit === "reps" ? record.actual_reps : record.actual_value,
          weight_lbs: record.weight_lbs,
          rest_seconds: record.rest_seconds,
          skipped: record.skipped,
          session_id: sessionData.id,
          user_id: session.user.id,
        })));
        if (logsError) throw logsError;
      }

      localStorage.removeItem(DRAFT_KEY);
      setFinished(true);
      setFinishOpen(false);
      setRestEndsAt(null);
      setSummaryOpen(true);
    } catch (saveError) {
      if (createdSessionId) {
        await supabase.from("workout_sessions").delete().eq("id", createdSessionId).eq("user_id", session.user.id);
      }
      notifications.show({ title: "Workout not saved", message: saveError.message || "Your draft is still safe on this device.", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Paper className="surface-raised" p="md" style={{ position: "sticky", top: 84, zIndex: 90 }}>
        <Group justify="space-between" wrap="nowrap">
          <Box><Text className="eyebrow">{workout.day} · {workout.type}</Text><Group gap="xs" mt={3}><Clock3 size={16} /><Text fw={850} ff="monospace">{formatTime(elapsedSeconds)}</Text></Group></Box>
          <Group gap="xs"><Tooltip label="Pause and return later"><ActionIcon variant="light" color="gray" size={42} onClick={() => setExitOpen(true)} aria-label="Pause or exit workout"><Pause size={18} /></ActionIcon></Tooltip><Badge variant="light" color="brand" size="lg">{handledSets}/{totalSets} sets</Badge></Group>
        </Group>
        <Progress value={progress} color="brand" size="sm" mt="md" aria-label={`${Math.round(progress)} percent of workout handled`} />
      </Paper>

      {workout.warmup && activeIndex === 0 && handledSets === 0 && (
        <Alert color="brand" icon={<FlameIcon />} title="Start with the warm-up">{workout.warmup}</Alert>
      )}

      {currentExercise ? (
        <Paper className="surface-raised" p={{ base: "lg", sm: 32 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Box style={{ minWidth: 0 }}><Text className="eyebrow">Exercise {activeIndex + 1} of {exercises.length}</Text><Title order={1} fz={{ base: 30, sm: 38 }} lts={-1} mt={5}>{currentExercise.name}</Title><Group gap="xs" mt="sm"><Badge variant="light">{currentExercise.muscle_group}</Badge>{currentExercise.tempo && <Badge variant="outline" color="gray">Tempo {currentExercise.tempo}</Badge>}</Group></Box>
            <ThemeIcon variant="light" color="brand" size={52}><Dumbbell size={23} /></ThemeIcon>
          </Group>

          {currentExercise.note && <Text size="sm" c="dimmed" mt="lg" p="md" bg="var(--surface-muted)" style={{ borderRadius: 10 }}>{currentExercise.note}</Text>}

          <Group mt="lg"><Button variant="light" color="gray" leftSection={<Info size={16} />} onClick={() => setGuideOpen(true)}>Form guide</Button><Button variant="subtle" leftSection={<RefreshCw size={16} />} onClick={() => setSwapOpen(true)}>Swap</Button></Group>

          <Divider my="xl" />
          <Group px="xs" mb="xs" wrap="nowrap"><Text className="eyebrow" w={40}>Set</Text><Text className="eyebrow" style={{ flex: 1 }}>Weight (lb)</Text><Text className="eyebrow" style={{ flex: 1 }}>{currentMetric.label}</Text><Text className="eyebrow" w={88} ta="right">Status</Text></Group>
          <Stack gap="xs">
            {Array.from({ length: Math.max(1, Number(currentExercise.sets) || 1) }, (_, setIndex) => {
              const key = slotKey(currentExercise, activeIndex, setIndex);
              const log = logs[key] || {};
              const metric = exerciseMetric(currentExercise);
              return (
                <Paper key={key} p="sm" bg={log.done ? "var(--brand-soft)" : log.skipped ? "var(--surface-muted)" : "transparent"} style={{ border: "1px solid var(--line)" }}>
                  <Group wrap="nowrap">
                    <Text fw={850} w={32}>{setIndex + 1}</Text>
                    <NumberInput aria-label={`${currentExercise.name} set ${setIndex + 1} weight in pounds`} value={log.weight} min={0} max={2000} step={5} hideControls size="sm" style={{ flex: 1 }} onChange={(value) => updateSet(currentExercise, activeIndex, setIndex, { weight: value })} disabled={log.skipped} />
                    <NumberInput aria-label={`${currentExercise.name} set ${setIndex + 1} completed ${metric.label.toLowerCase()}`} value={log.reps} min={0} max={metric.kind === "reps" ? 500 : metric.kind === "distance" ? 100000 : 7200} decimalScale={metric.unit === "minutes" || metric.kind === "distance" ? 1 : 0} hideControls size="sm" style={{ flex: 1 }} onChange={(value) => updateSet(currentExercise, activeIndex, setIndex, { reps: value })} disabled={log.skipped} />
                    <Group gap={4} w={88} justify="flex-end" wrap="nowrap">
                      <Tooltip label={log.skipped ? "Restore set" : "Skip set"}><ActionIcon variant="subtle" color="gray" size={38} onClick={() => skipSet(currentExercise, activeIndex, setIndex)} aria-label={log.skipped ? `Restore set ${setIndex + 1}` : `Skip set ${setIndex + 1}`}><CircleMinus size={17} /></ActionIcon></Tooltip>
                      <Tooltip label={log.done ? "Mark incomplete" : "Mark complete"}><ActionIcon variant={log.done ? "filled" : "light"} color={log.done ? "green" : "brand"} c={log.done ? undefined : "dark.9"} size={40} onClick={() => completeSet(currentExercise, activeIndex, setIndex)} aria-label={log.done ? `Mark set ${setIndex + 1} incomplete` : `Complete set ${setIndex + 1}`}><Check size={19} /></ActionIcon></Tooltip>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>

          <Group justify="space-between" mt="xl">
            <Button variant="subtle" color="gray" leftSection={<ChevronLeft size={17} />} disabled={activeIndex === 0} onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}>Previous</Button>
            {activeIndex < exercises.length - 1 ? <Button rightSection={<ChevronRight size={17} />} onClick={() => setActiveIndex((value) => Math.min(exercises.length - 1, value + 1))}>Next exercise</Button> : <Button color="brand" c="dark.9" rightSection={<CheckCircle2 size={17} />} onClick={() => setFinishOpen(true)} disabled={handledSets === 0}>Review & finish</Button>}
          </Group>
        </Paper>
      ) : (
        <Alert color="red" icon={<CircleAlert size={18} />}>This workout doesn't contain any exercises. Return to your plan and rebuild it.</Alert>
      )}

      <Group justify="space-between" visibleFrom="sm">
        <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={16} />} onClick={() => setExitOpen(true)}>Pause session</Button>
        <Text size="sm" c="dimmed">Changes are saved on this device after every set.</Text>
      </Group>

      {restRemaining !== null && (
        <Box pos="fixed" bottom={18} left="50%" style={{ transform: "translateX(-50%)", zIndex: 200, width: "min(92vw, 520px)" }} className="workout-dock">
          <Paper className="today-card" p="md">
            <Group justify="space-between" wrap="nowrap" style={{ position: "relative", zIndex: 1 }}>
              <Group gap="sm"><ThemeIcon color="brand" c="dark.9" radius="xl"><Timer size={18} /></ThemeIcon><Box aria-live="polite"><Text size="xs" c="gray.5" fw={800}>REST TIMER</Text><Text fw={900} fz="xl" ff="monospace">{formatTime(restRemaining)}</Text></Box></Group>
              <Group gap={4}><ActionIcon variant="subtle" color="gray" c="white" size={40} onClick={() => adjustRest(-15)} aria-label="Remove 15 seconds"><Minus size={17} /></ActionIcon><ActionIcon variant="subtle" color="gray" c="white" size={40} onClick={() => adjustRest(15)} aria-label="Add 15 seconds"><Plus size={17} /></ActionIcon><Button variant="light" color="gray" size="xs" onClick={() => setRestEndsAt(null)}>End</Button></Group>
            </Group>
          </Paper>
        </Box>
      )}

      <Modal opened={exitOpen} onClose={() => setExitOpen(false)} title="Pause this workout?">
        <Stack><Text size="sm" c="dimmed">Your set entries are already saved on this device. Resume from Today whenever you're ready.</Text><Group justify="flex-end"><Button variant="subtle" color="red" onClick={discardWorkout} leftSection={<X size={16} />}>Discard</Button><Button onClick={pauseWorkout} leftSection={<Pause size={16} />}>Save & exit</Button></Group></Stack>
      </Modal>

      <Modal opened={finishOpen} onClose={() => setFinishOpen(false)} title={handledSets < totalSets ? "Finish with sets remaining?" : "Finish workout"}>
        <Stack>
          {handledSets < totalSets && <Alert color="orange" icon={<CircleAlert size={17} />}>{totalSets - handledSets} sets are unfinished. They'll be recorded as skipped—not as reps you didn't enter.</Alert>}
          <SimpleGrid cols={3}><ReviewMetric label="Done" value={completedSets} /><ReviewMetric label="Skipped" value={skippedSets + (totalSets - handledSets)} /><ReviewMetric label="Volume" value={`${volume.toLocaleString()} lb`} /></SimpleGrid>
          <Textarea label="Session note (optional)" placeholder="What felt good? What should change next time?" value={notes} onChange={(event) => setNotes(event.currentTarget.value)} maxLength={1000} />
          <Group justify="flex-end"><Button variant="subtle" color="gray" onClick={() => setFinishOpen(false)} disabled={saving}>Keep training</Button><Button onClick={saveWorkout} loading={saving} leftSection={<Check size={16} />}>Save workout</Button></Group>
        </Stack>
      </Modal>

      <Modal opened={summaryOpen} onClose={() => navigate("/dashboard", { replace: true })} title="Session saved" withCloseButton={false}>
        <Stack align="center" py="lg"><ThemeIcon size={74} radius="xl" color="brand" c="dark.9"><CheckCircle2 size={34} /></ThemeIcon><Box ta="center"><Title order={2}>Work logged. Nicely done.</Title><Text c="dimmed" mt="xs">Honest reps make the next plan smarter.</Text></Box><SimpleGrid cols={3} w="100%"><ReviewMetric label="Time" value={formatTime(elapsedSeconds)} /><ReviewMetric label="Sets" value={completedSets} /><ReviewMetric label="Volume" value={`${volume.toLocaleString()} lb`} /></SimpleGrid><Button fullWidth size="lg" onClick={() => navigate("/dashboard", { replace: true })} rightSection={<ArrowRight size={17} />}>Back to Today</Button></Stack>
      </Modal>

      <ExerciseGuideModal opened={guideOpen} onClose={() => setGuideOpen(false)} exercise={currentExercise} equipmentImageUrl={getEquipmentById(currentExercise?.equipment_id)?.image_url} equipmentName={getEquipmentById(currentExercise?.equipment_id)?.name} onRequestSwap={() => { setGuideOpen(false); setSwapOpen(true); }} />
      <ExerciseSwapModal opened={swapOpen} onClose={() => setSwapOpen(false)} exercise={currentExercise} selectedEquipment={profile.equipment} onSelect={handleSwap} title="Swap for this session" />
    </Stack>
  );
}

function ReviewMetric({ label, value }) {
  return <Box ta="center" p="sm"><Text className="eyebrow">{label}</Text><Text fw={900} mt={5}>{value}</Text></Box>;
}

function FlameIcon() {
  return <Dumbbell size={18} />;
}
