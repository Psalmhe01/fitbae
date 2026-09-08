import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Center, Group, Loader, Modal, Paper,
  SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowRight, CalendarDays, Check, CircleAlert, Coffee, Dumbbell,
  Flame, HeartHandshake, Info, RefreshCw, RotateCcw, ShieldCheck, TimerReset,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import {
  normalizeAndValidateWorkoutPlan,
  substitutePlanExercise,
} from "@/lib/workoutPlan";
import { ExerciseGuideModal } from "@/components/ExerciseGuideModal";
import { ExerciseSwapModal } from "@/components/ExerciseSwapModal";

const ACTIVE_DRAFT_KEY = "fitbae-active-workout";

function getPausedDraft(userId) {
  try {
    const draft = JSON.parse(localStorage.getItem(ACTIVE_DRAFT_KEY));
    return draft?.userId === userId && draft?.workout ? draft : null;
  } catch {
    return null;
  }
}

export default function PlanPage() {
  const { profile, session } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [planRecord, setPlanRecord] = useState(null);
  const [guideExercise, setGuideExercise] = useState(null);
  const [swapExercise, setSwapExercise] = useState(null);
  const [savingSwap, setSavingSwap] = useState(false);
  const [lastSwap, setLastSwap] = useState(null);
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [planIssues, setPlanIssues] = useState([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      setPlanIssues([]);
      try {
        const { data, error: fetchError } = await supabase.from("workout_plans").select("*").eq("user_id", session.user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (fetchError) throw new Error("Your plan couldn't be loaded. Check your connection and try again.");
        if (!active) return;
        if (data?.plan_json) {
          const rawPlan = typeof data.plan_json === "string" ? JSON.parse(data.plan_json) : data.plan_json;
          if (!rawPlan || (!Array.isArray(rawPlan.weekly_schedule) && !Array.isArray(rawPlan.days))) {
            throw new Error("This saved plan is incomplete. Try loading it again or rebuild your week from Today.");
          }
          const normalized = normalizeAndValidateWorkoutPlan(rawPlan, {
            selectedEquipment: profile?.equipment,
            expectedFrequency: profile?.gym_frequency,
          });
          setPlanRecord({ ...data, plan_json: normalized.plan });
          setPlanIssues(normalized.errors);
        } else setPlanRecord(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof SyntaxError ? "This saved plan couldn't be read. Rebuild it from Today." : loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [loadAttempt, profile?.equipment, profile?.gym_frequency, session?.user?.id]);

  const schedule = planRecord?.plan_json?.weekly_schedule || [];
  const selectedDayName = searchParams.get("day") || location.state?.day
    || new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const selectedDay = schedule.find((day) => day.day === selectedDayName) || schedule[0];

  const persistPlan = async (nextPlan, successMessage) => {
    if (!planRecord?.id || savingSwap) return false;
    setSavingSwap(true);
    try {
      const { error: updateError } = await supabase.from("workout_plans")
        .update({ plan_json: nextPlan })
        .eq("id", planRecord.id)
        .eq("user_id", session.user.id).select("id").single();
      if (updateError) throw updateError;
      setPlanRecord((current) => ({ ...current, plan_json: nextPlan }));
      if (successMessage) notifications.show({ title: successMessage, message: "The rest of your week stayed exactly the same.", color: "green" });
      return true;
    } catch (updateError) {
      notifications.show({ title: "Change not saved", message: updateError.message, color: "red" });
      return false;
    } finally {
      setSavingSwap(false);
    }
  };

  const handleSwap = async (replacement, metadata) => {
    if (!selectedDay || !swapExercise) return false;
    const previousPlan = planRecord.plan_json;
    const nextPlan = substitutePlanExercise(previousPlan, {
      dayId: selectedDay.day_id || selectedDay.id,
      slotId: swapExercise.slot_id || swapExercise.id,
      replacement,
      preservePrescription: true,
    });
    const saved = await persistPlan(nextPlan, `${replacement.name} is in`);
    if (saved) {
      setLastSwap({ previousPlan, from: swapExercise.name, to: replacement.name, reason: metadata?.reason });
      setSwapExercise(null);
    }
    return saved;
  };

  const undoSwap = async () => {
    if (!lastSwap) return;
    const restored = await persistPlan(lastSwap.previousPlan, "Swap undone");
    if (restored) setLastSwap(null);
  };

  const openSwapFromGuide = (exercise) => {
    setGuideExercise(null);
    setSwapExercise(exercise);
  };

  const startWorkout = (workout) => {
    if (getPausedDraft(session.user.id)) {
      setPendingWorkout(workout);
      return;
    }
    navigate("/workout", { state: { workout, planId: planRecord.id } });
  };

  const replacePausedWorkout = () => {
    if (!pendingWorkout) return;
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    navigate("/workout", { state: { workout: pendingWorkout, planId: planRecord.id } });
  };

  const activeCount = useMemo(() => schedule.filter((day) => !day.rest).length, [schedule]);

  if (loading) return <Center mih="55vh"><Loader color="brand" /></Center>;
  if (error) return <Alert color="red" title="Your plan couldn't open" icon={<CircleAlert size={18} />}><Text size="sm">{error}</Text><Group mt="md"><Button variant="light" color="red" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</Button><Button variant="subtle" color="gray" onClick={() => navigate("/dashboard")}>Back to Today</Button></Group></Alert>;
  if (!planRecord || !schedule.length) {
    return <Paper className="surface-raised" p={{ base: "xl", md: 48 }}><ThemeIcon color="brand" variant="light" size={54}><CalendarDays size={25} /></ThemeIcon><Title order={2} mt="xl">No active plan yet</Title><Text c="dimmed" mt="sm">Return to Today to build a fresh plan from your saved preferences.</Text><Button mt="xl" onClick={() => navigate("/dashboard")}>Go to Today</Button></Paper>;
  }

  return (
    <Stack gap={32}>
      <Group justify="space-between" align="flex-end">
        <Box><Text className="eyebrow">{activeCount} training days · 7-day rhythm schedule</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Your plan</Title><Text c="dimmed" mt="xs" maw={650}>{planRecord.plan_json.overview || "A balanced week built around your goal, time, and available equipment."}</Text></Box>
        <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={() => navigate("/dashboard", { state: { openRegenerate: true } })}>Rebuild week</Button>
      </Group>

      {lastSwap && (
        <Alert color="brand" icon={<Check size={18} />} title={`${lastSwap.from} → ${lastSwap.to}`} withCloseButton onClose={() => setLastSwap(null)}>
          <Group justify="space-between"><Text size="sm">Swap saved to this plan.</Text><Button variant="subtle" size="xs" leftSection={<RotateCcw size={14} />} onClick={undoSwap} loading={savingSwap}>Undo</Button></Group>
        </Alert>
      )}

      {planRecord.plan_json.safety_note && (
        <Alert color="orange" variant="light" icon={<ShieldCheck size={18} />} title="Train with good judgment">{planRecord.plan_json.safety_note}</Alert>
      )}

      {planIssues.length > 0 && <Alert color="orange" title="Review this plan before training">Your saved week has {planIssues.length === 1 ? "an item" : "items"} to review: {planIssues.slice(0, 3).map((issue) => issue.message).join(" ")}</Alert>}

      <SimpleGrid cols={7} spacing={{ base: 5, sm: "sm" }}>
        {schedule.map((day) => (
          <UnstyledButton
            key={day.day_id || day.day}
            className="day-pill"
            data-active={day.day === selectedDay?.day}
            onClick={() => setSearchParams((current) => { current.set("day", day.day); return current; }, { replace: true })}
            py={{ base: 10, sm: 14 }} px={{ base: 3, sm: 8 }}
            style={{ borderRadius: 10, textAlign: "center" }}
            aria-pressed={day.day === selectedDay?.day}
            aria-label={`${day.day}: ${day.rest ? "rest" : day.type}`}
          >
            <Text size="xs" fw={850}>{day.day.slice(0, 3)}</Text>
            <Text size="xs" c={day.day === selectedDay?.day ? undefined : "dimmed"} mt={2} visibleFrom="sm">{day.rest ? "Rest" : `${day.exercises?.length || 0} moves`}</Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      {selectedDay && (
        <Box className="plan-layout">
          <Box className="plan-main">
            <Paper className="surface-raised" p={{ base: "lg", md: 32 }}>
              <Group justify="space-between" align="flex-start">
                <Box><Group gap="xs"><Badge variant="light" color={selectedDay.rest ? "gray" : "brand"}>{selectedDay.day}</Badge>{!selectedDay.rest && <Badge variant="outline" color="gray">~{selectedDay.estimated_duration_mins || profile.workout_duration} min</Badge>}</Group><Title order={2} fz={{ base: 30, md: 38 }} lts={-1} mt="md">{selectedDay.type}</Title><Text c="dimmed" mt={5}>{selectedDay.focus}</Text></Box>
                <ThemeIcon size={52} variant="light" color={selectedDay.rest ? "gray" : "brand"}>{selectedDay.rest ? <Coffee size={23} /> : <Dumbbell size={23} />}</ThemeIcon>
              </Group>
              {selectedDay.why && <Text size="sm" mt="lg" p="md" bg="var(--surface-muted)" style={{ borderRadius: 10 }}>{selectedDay.why}</Text>}
              {!selectedDay.rest && <Button mt="xl" size="lg" onClick={() => startWorkout(selectedDay)} rightSection={<ArrowRight size={18} />}>Start this workout</Button>}
            </Paper>

            {!selectedDay.rest && (
              <Paper className="surface-raised" p={{ base: "lg", md: "xl" }} mt="lg">
                <Group justify="space-between" mb="sm"><Box><Text className="eyebrow">Workout order</Text><Title order={2} fz={25} mt={4}>{selectedDay.exercises.length} movements</Title></Box><Text size="xs" c="dimmed">Tap guide for form help</Text></Group>
                <Stack gap={0}>
                  {selectedDay.exercises.map((exercise, index) => (
                    <ExerciseRow key={exercise.slot_id || exercise.id || `${exercise.name}-${index}`} exercise={exercise} index={index} openGuide={() => setGuideExercise(exercise)} openSwap={() => setSwapExercise(exercise)} />
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>

          <Stack gap="lg" className="plan-side">
            {selectedDay.rest ? (
              <Paper className="surface partner-accent" p="xl"><ThemeIcon color="orange" variant="light" size={48}><HeartHandshake size={22} /></ThemeIcon><Title order={3} mt="lg">Recovery counts.</Title><Text c="dimmed" size="sm" mt="sm" lh={1.55}>{selectedDay.cooldown || "Take an easy walk, move through comfortable ranges, and make space for the next session."}</Text></Paper>
            ) : (
              <>
                <RoutineCard icon={Flame} title="Warm up" text={selectedDay.warmup} />
                {selectedDay.partner_finisher && <PartnerFinisher finisher={selectedDay.partner_finisher} />}
                <RoutineCard icon={TimerReset} title="Cool down" text={selectedDay.cooldown} />
              </>
            )}
          </Stack>
        </Box>
      )}

      {planRecord.plan_json.progression && (
        <Paper className="surface" p="xl"><Group align="flex-start" wrap="nowrap"><ThemeIcon color="brand" variant="light"><ArrowRight size={17} /></ThemeIcon><Box><Text className="eyebrow">Next-week progression</Text><Text size="sm" mt="sm" lh={1.55}>{planRecord.plan_json.progression}</Text></Box></Group></Paper>
      )}

      <ExerciseGuideModal
        opened={Boolean(guideExercise)}
        onClose={() => setGuideExercise(null)}
        exercise={guideExercise}
        equipmentImageUrl={guideExercise ? getEquipmentById(guideExercise.equipment_id)?.image_url : undefined}
        equipmentName={guideExercise ? getEquipmentById(guideExercise.equipment_id)?.name : undefined}
        onRequestSwap={openSwapFromGuide}
      />
      <ExerciseSwapModal
        opened={Boolean(swapExercise)}
        onClose={() => setSwapExercise(null)}
        exercise={swapExercise}
        selectedEquipment={profile.equipment}
        onSelect={handleSwap}
        title="Choose a better fit"
      />
      <Modal opened={Boolean(pendingWorkout)} onClose={() => setPendingWorkout(null)} title="You already have a paused workout">
        <Stack><Text size="sm" c="dimmed">Resume the saved session to keep its set entries, or discard it and start {pendingWorkout?.type || "this workout"}.</Text><Group justify="flex-end"><Button variant="light" color="gray" onClick={() => navigate("/workout")}>Resume paused</Button><Button color="red" variant="light" onClick={replacePausedWorkout}>Discard & start new</Button></Group></Stack>
      </Modal>
    </Stack>
  );
}

function ExerciseRow({ exercise, index, openGuide, openSwap }) {
  return (
    <Box className="exercise-row">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon variant="light" color="gray" radius="md">{String(index + 1).padStart(2, "0")}</ThemeIcon>
          <Box style={{ minWidth: 0 }}><Text fw={800}>{exercise.name}</Text><Group gap={6} mt={5}><Badge variant="light" size="xs">{exercise.muscle_group}</Badge>{exercise.equipment && <Text size="xs" c="dimmed" truncate>{exercise.equipment}</Text>}</Group>{exercise.why && <Text size="sm" c="dimmed" mt="sm" lineClamp={2}>{exercise.why}</Text>}</Box>
        </Group>
        <Stack align="flex-end" gap={4}><Text fw={850} style={{ whiteSpace: "nowrap" }}>{exercise.sets} × {exercise.reps}</Text><Text size="xs" c="dimmed">{exercise.rest_seconds}s rest</Text></Stack>
      </Group>
      <Group mt="md" ml={52}><Button variant="light" color="gray" size="xs" leftSection={<Info size={14} />} onClick={openGuide}>Form guide</Button><Button variant="subtle" size="xs" leftSection={<RefreshCw size={14} />} onClick={openSwap}>Swap</Button></Group>
    </Box>
  );
}

function RoutineCard({ icon: Icon, title, text }) {
  return <Paper className="surface" p="xl"><ThemeIcon variant="light" color="brand"><Icon size={17} /></ThemeIcon><Text className="eyebrow" mt="lg">{title}</Text><Text size="sm" c="dimmed" mt="sm" lh={1.55}>{text || "Move gradually and stay within a comfortable range."}</Text></Paper>;
}

function PartnerFinisher({ finisher }) {
  return <Paper className="surface partner-accent" p="xl"><Group justify="space-between"><ThemeIcon variant="light" color="orange"><HeartHandshake size={18} /></ThemeIcon><Badge color="orange" variant="light">{finisher.duration_minutes} min</Badge></Group><Text className="eyebrow" mt="lg">Together finisher</Text><Title order={3} fz="lg" mt={5}>{finisher.name}</Title><Text size="sm" c="dimmed" mt={4}>{finisher.format}</Text><Stack component="ol" pl="lg" mt="md" gap={5}>{finisher.instructions?.map((step, index) => <Text component="li" size="sm" key={`${step}-${index}`}>{step}</Text>)}</Stack>{finisher.solo_alternative && <Text size="xs" c="dimmed" mt="md">Solo option: {finisher.solo_alternative}</Text>}</Paper>;
}
