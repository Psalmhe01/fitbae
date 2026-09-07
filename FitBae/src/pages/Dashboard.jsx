import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Center, Group, Loader, Modal, Paper,
  Progress, SimpleGrid, Stack, Text, ThemeIcon, Title, UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowRight, CalendarDays, Check, CircleAlert, Clock3, Dumbbell,
  Flame, Heart, RefreshCw, RotateCcw, Settings2, Sparkles,
} from "lucide-react";
import { isMissingDatabaseFunction, supabase } from "@/lib/supabase";
import { generateWorkoutPlan } from "@/lib/gemini";
import { normalizeAndValidateWorkoutPlan } from "@/lib/workoutPlan";

const ACTIVE_DRAFT_KEY = "fitbae-active-workout";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfLocalWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStoredDraft(userId) {
  try {
    const draft = JSON.parse(localStorage.getItem(ACTIVE_DRAFT_KEY));
    return draft?.userId === userId && draft?.workout ? draft : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, session } = useOutletContext();
  const [planRecord, setPlanRecord] = useState(null);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [weekSessions, setWeekSessions] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(() => Boolean(location.state?.openRegenerate));
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [draft, setDraft] = useState(() => getStoredDraft(session?.user?.id));

  const loadDashboard = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError("");
    const { data: latestPlan, error: planError } = await supabase
      .from("workout_plans").select("*").eq("user_id", session.user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (planError) {
      setError("Your training plan couldn't be loaded. Try again in a moment.");
      setLoading(false);
      return;
    }

    let normalizedRecord = latestPlan;
    if (latestPlan?.plan_json) {
      const result = normalizeAndValidateWorkoutPlan(latestPlan.plan_json, {
        selectedEquipment: profile?.equipment,
        expectedFrequency: profile?.gym_frequency,
      });
      normalizedRecord = { ...latestPlan, plan_json: result.plan, planWarnings: result.warnings };
    }
    setPlanRecord(normalizedRecord);

    const requests = [];
    if (latestPlan?.id) {
      requests.push(
        supabase.from("workout_sessions").select("id,day,workout_type,duration_seconds,finished_at,status")
          .eq("user_id", session.user.id).eq("plan_id", latestPlan.id)
          .eq("status", "completed").gte("finished_at", startOfLocalWeek().toISOString()),
      );
    } else {
      requests.push(Promise.resolve({ data: [], error: null }));
    }
    requests.push(
      supabase.from("partnerships").select("*")
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .eq("status", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    );
    const [sessionsResult, partnershipResult] = await Promise.all(requests);
    const sessions = sessionsResult.data || [];
    setWeekSessions(sessions);
    setCompletedDays(new Set(sessions.map((item) => item.day).filter(Boolean)));

    if (partnershipResult.data) {
      const partnerId = partnershipResult.data.requester_id === session.user.id
        ? partnershipResult.data.recipient_id : partnershipResult.data.requester_id;
      const sharedProfile = await supabase.rpc("get_connected_partner");
      let partnerProfile = sharedProfile.data?.[0] || null;
      if (sharedProfile.error && isMissingDatabaseFunction(sharedProfile.error, "get_connected_partner")) {
        const legacyProfile = await supabase.from("profiles")
          .select("user_id,name,gym_frequency,fitness_goal").eq("user_id", partnerId).maybeSingle();
        partnerProfile = legacyProfile.data || null;
      }
      setPartner(partnerProfile || { user_id: partnerId, name: "Your partner" });
    } else {
      setPartner(null);
    }
    setDraft(getStoredDraft(session.user.id));
    setLoading(false);
  }, [profile?.equipment, profile?.gym_frequency, session?.user?.id]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!location.state?.openRegenerate) return;
    setConfirmRegenerate(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.openRegenerate, navigate]);

  const schedule = planRecord?.plan_json?.weekly_schedule || [];
  const activeDays = schedule.filter((day) => !day.rest);
  const progress = activeDays.length
    ? Math.min(100, (completedDays.size / activeDays.length) * 100)
    : 0;

  const today = DAY_NAMES[new Date().getDay()];
  const todayPlan = schedule.find((day) => day.day === today);
  const nextWorkout = useMemo(() => {
    if (!schedule.length) return null;
    const todayIndex = DAY_NAMES.indexOf(today);
    for (let offset = 0; offset < 7; offset += 1) {
      const candidateName = DAY_NAMES[(todayIndex + offset) % 7];
      const candidate = schedule.find((day) => day.day === candidateName && !day.rest);
      if (candidate) return { ...candidate, isToday: offset === 0 };
    }
    return null;
  }, [schedule, today]);

  const minutesThisWeek = weekSessions.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0), 0) / 60;

  const startWorkout = (workout) => {
    const paused = getStoredDraft(session.user.id);
    if (paused) {
      setDraft(paused);
      setPendingWorkout(workout);
      return;
    }
    navigate("/workout", { state: { workout, planId: planRecord?.id } });
  };

  const replacePausedWorkout = () => {
    if (!pendingWorkout) return;
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    navigate("/workout", { state: { workout: pendingWorkout, planId: planRecord?.id } });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const planJson = await generateWorkoutPlan(profile);
      const normalized = normalizeAndValidateWorkoutPlan(planJson, {
        selectedEquipment: profile.equipment,
        expectedFrequency: profile.gym_frequency,
      });
      if (!normalized.valid) throw new Error(normalized.errors[0] || "The generated plan was incomplete.");
      const { data, error: insertError } = await supabase.from("workout_plans").insert({
        user_id: session.user.id,
        plan_json: normalized.plan,
        fitness_goal: profile.fitness_goal,
        experience_level: profile.experience_level,
      }).select("*").single();
      if (insertError) throw insertError;
      setPlanRecord(data);
      setCompletedDays(new Set());
      setWeekSessions([]);
      setConfirmRegenerate(false);
      notifications.show({ title: "Your new week is ready", message: "Review it and swap anything that doesn't feel right.", color: "green" });
    } catch (generationError) {
      notifications.show({ title: "We couldn't rebuild the plan", message: generationError.message, color: "red" });
    } finally {
      setRegenerating(false);
    }
  };

  const sendEncouragement = async () => {
    if (!partner?.user_id) return;
    const { error: sendError } = await supabase.from("partner_reactions").insert({
      sender_id: session.user.id, recipient_id: partner.user_id,
      type: "heart", message: `${profile.name?.split(" ")[0] || "Your partner"} is cheering you on`,
    });
    if (sendError) notifications.show({ title: "Couldn't send that", message: sendError.message, color: "red" });
    else notifications.show({ title: `Sent to ${partner.name?.split(" ")[0] || "your partner"}`, message: "A little encouragement goes a long way.", color: "orange" });
  };

  if (loading) return <Center mih="55vh"><Loader color="brand" /></Center>;

  if (error) {
    return (
      <Alert icon={<CircleAlert size={18} />} title="Something went wrong" color="red">
        <Text size="sm" mb="md">{error}</Text>
        <Button variant="light" color="red" onClick={loadDashboard}>Try again</Button>
      </Alert>
    );
  }

  if (!planRecord || !schedule.length) {
    return (
      <Stack gap="xl">
        <PageHeading profile={profile} />
        <Paper className="surface-raised" p={{ base: "xl", md: 48 }}>
          <ThemeIcon color="brand" c="dark.9" size={56} radius="md"><Sparkles size={27} /></ThemeIcon>
          <Title order={2} mt="xl">Let's finish your training setup.</Title>
          <Text c="dimmed" mt="sm" maw={560}>Your profile is saved, but there isn't a usable plan yet. Rebuild it now—your answers are still here.</Text>
          <Button mt="xl" onClick={() => setConfirmRegenerate(true)} rightSection={<ArrowRight size={18} />}>Create my plan</Button>
        </Paper>
        <RegenerateModal opened={confirmRegenerate} close={() => setConfirmRegenerate(false)} run={handleRegenerate} loading={regenerating} firstPlan />
      </Stack>
    );
  }

  return (
    <Stack gap={32}>
      <PageHeading profile={profile} />

      {draft && (
        <Alert icon={<RotateCcw size={20} />} color="brand" title="Workout paused">
          <Group justify="space-between" align="center">
            <Text size="sm">{draft.workout.type} · {draft.completedSets || 0} sets logged</Text>
            <Button size="sm" onClick={() => navigate("/workout", { state: { resume: true } })}>Resume</Button>
          </Group>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <Paper className="today-card dashboard-primary" p={{ base: "xl", md: 32 }}>
          <Stack gap="lg" style={{ position: "relative", zIndex: 1 }}>
            <Group justify="space-between">
              <Text className="eyebrow" c="gray.5">{nextWorkout?.isToday ? "Today's session" : "Up next"}</Text>
              {todayPlan?.rest && <Badge variant="light" color="brand">Recovery today</Badge>}
            </Group>
            <Box>
              <Title order={2} fz={{ base: 34, md: 46 }} lts={-1.5}>{nextWorkout?.type || "Recovery day"}</Title>
              <Text c="gray.4" mt={6}>{nextWorkout?.focus || todayPlan?.cooldown || "A little recovery keeps the next session strong."}</Text>
            </Box>
            {nextWorkout && (
              <Group gap="lg">
                <Group gap={7}><Dumbbell size={16} color="var(--brand)" /><Text size="sm">{nextWorkout.exercises?.length || 0} movements</Text></Group>
                <Group gap={7}><Clock3 size={16} color="var(--brand)" /><Text size="sm">~{nextWorkout.estimated_duration_mins || profile.workout_duration} min</Text></Group>
              </Group>
            )}
            <Group mt="sm">
              {nextWorkout && <Button color="brand" c="dark.9" size="lg" onClick={() => startWorkout(nextWorkout)} rightSection={<ArrowRight size={18} />}>Start workout</Button>}
              <Button component={Link} to="/plan" variant="subtle" color="gray" c="gray.3">View details</Button>
            </Group>
          </Stack>
        </Paper>

        <Paper className="surface-raised partner-accent" p="xl">
          <Text className="eyebrow">Together</Text>
          {partner ? (
            <Stack mt="lg" gap="md">
              <Group gap="sm"><ThemeIcon color="orange" variant="light" radius="xl"><Heart size={17} fill="currentColor" /></ThemeIcon><Box><Text fw={800}>{partner.name}</Text><Text size="xs" c="dimmed">Your training teammate</Text></Box></Group>
              <Text size="sm" c="dimmed">A quick nudge can be the difference between “later” and “done.”</Text>
              <Group><Button size="sm" color="orange" variant="light" leftSection={<Heart size={15} />} onClick={sendEncouragement}>Send a boost</Button><Button component={Link} to="/together" size="sm" variant="subtle">Open Together</Button></Group>
            </Stack>
          ) : (
            <Stack mt="lg" gap="md"><Title order={3} fz="xl">Bring your person in.</Title><Text size="sm" c="dimmed">Connect to share wins, notes, and the rhythm of your week.</Text><Button component={Link} to="/together" variant="light" color="orange">Connect partner</Button></Stack>
          )}
        </Paper>
      </SimpleGrid>

      <Box>
        <Group justify="space-between" align="flex-end" mb="md">
          <Box><Text className="eyebrow">Your week</Text><Title order={2} fz={28} mt={4}>{completedDays.size} of {activeDays.length} sessions done</Title></Box>
          <Button variant="subtle" color="gray" leftSection={<Settings2 size={16} />} component={Link} to="/plan">Adjust plan</Button>
        </Group>
        <Paper className="surface" p="md">
          <Progress value={progress} color="brand" size="sm" radius="xl" mb="md" aria-label={`${Math.round(progress)} percent of weekly workouts complete`} />
          <SimpleGrid cols={7} spacing={{ base: 5, sm: "sm" }}>
            {schedule.map((day) => {
              const complete = completedDays.has(day.day);
              return (
                <UnstyledButton
                  key={day.day_id || day.day}
                  className="day-pill"
                  data-active={day.day === today}
                  data-complete={complete}
                  onClick={() => navigate("/plan", { state: { day: day.day } })}
                  py={{ base: 10, sm: 14 }}
                  px={{ base: 3, sm: 8 }}
                  style={{ borderRadius: 10, textAlign: "center" }}
                  aria-label={`${day.day}: ${day.rest ? "rest day" : day.type}${complete ? ", completed" : ""}`}
                >
                  <Text size="xs" fw={800}>{day.day.slice(0, 3)}</Text>
                  <Text size="xs" c={day.day === today ? undefined : "dimmed"} mt={2} visibleFrom="sm">{day.rest ? "Rest" : day.type?.split(" ")[0]}</Text>
                  {complete && <Check size={13} style={{ margin: "5px auto 0" }} />}
                </UnstyledButton>
              );
            })}
          </SimpleGrid>
        </Paper>
      </Box>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Metric icon={Flame} label="This week" value={`${completedDays.size}`} suffix="sessions" />
        <Metric icon={Clock3} label="Time trained" value={`${Math.round(minutesThisWeek)}`} suffix="minutes" />
        <Metric icon={CalendarDays} label="Plan rhythm" value={`${activeDays.length}×`} suffix="per week" />
        <Metric icon={Dumbbell} label="Session length" value={`${profile.workout_duration}`} suffix="minutes" />
      </SimpleGrid>

      <Group justify="space-between" pt="md" style={{ borderTop: "1px solid var(--line)" }}>
        <Text size="sm" c="dimmed">Want a completely different week?</Text>
        <Button variant="subtle" color="gray" leftSection={<RefreshCw size={16} />} onClick={() => setConfirmRegenerate(true)}>Rebuild plan</Button>
      </Group>

      <RegenerateModal opened={confirmRegenerate} close={() => setConfirmRegenerate(false)} run={handleRegenerate} loading={regenerating} />
      <Modal opened={Boolean(pendingWorkout)} onClose={() => setPendingWorkout(null)} title="You already have a paused workout">
        <Stack><Text size="sm" c="dimmed">Resume the saved session to keep its set entries, or discard it and start {pendingWorkout?.type || "this workout"}.</Text><Group justify="flex-end"><Button variant="light" color="gray" onClick={() => navigate("/workout")}>Resume paused</Button><Button color="red" variant="light" onClick={replacePausedWorkout}>Discard & start new</Button></Group></Stack>
      </Modal>
    </Stack>
  );
}

function PageHeading({ profile }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <Box><Text className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>{greeting}, {profile.name?.split(" ")[0]}.</Title></Box>;
}

function Metric({ icon: Icon, label, value, suffix }) {
  return <Paper className="surface" p="lg"><Group gap="xs"><Icon size={16} color="var(--ink-soft)" /><Text className="eyebrow">{label}</Text></Group><Text className="metric-number" fz={{ base: 28, md: 36 }} fw={850} mt="md">{value}</Text><Text size="xs" c="dimmed">{suffix}</Text></Paper>;
}

function RegenerateModal({ opened, close, run, loading, firstPlan = false }) {
  return (
    <Modal opened={opened} onClose={close} title={firstPlan ? "Build your plan" : "Rebuild this week?"} closeOnClickOutside={!loading} withCloseButton={!loading}>
      <Stack>
        <Text size="sm" c="dimmed">{firstPlan ? "We'll use your saved profile and equipment to create a complete seven-day schedule." : "This creates a fresh plan from your current preferences. Your completed workout history stays safe."}</Text>
        {!firstPlan && <Alert color="orange" icon={<CircleAlert size={17} />}>Try swapping a single exercise from Plan if only one movement isn't working.</Alert>}
        <Group justify="flex-end"><Button variant="subtle" color="gray" onClick={close} disabled={loading}>Cancel</Button><Button onClick={run} loading={loading} leftSection={<RefreshCw size={16} />}>{firstPlan ? "Create plan" : "Rebuild"}</Button></Group>
      </Stack>
    </Modal>
  );
}
