import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Center, Divider, Group, Loader, Paper,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from "@mantine/core";
import { ArrowLeft, CalendarDays, Check, Clock3, Dumbbell, RotateCcw, Weight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatTimestamp, userTimeZone } from "@/lib/dates";

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const { session: authSession } = useOutletContext();
  const navigate = useNavigate();
  const [workoutSession, setWorkoutSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authSession?.user?.id) return;
    let active = true;
    Promise.all([
      supabase.from("workout_sessions").select("*").eq("id", sessionId).eq("user_id", authSession.user.id).maybeSingle(),
      supabase.from("exercise_logs").select("*").eq("session_id", sessionId).eq("user_id", authSession.user.id).order("completed_at", { ascending: true }),
    ]).then(([sessionResult, logsResult]) => {
      if (!active) return;
      if (sessionResult.error || logsResult.error) setError("We couldn't load this session.");
      setWorkoutSession(sessionResult.data || null);
      setLogs((logsResult.data || []).sort((a, b) => String(a.exercise_name).localeCompare(String(b.exercise_name)) || (a.set_number || 0) - (b.set_number || 0)));
      setLoading(false);
    });
    return () => { active = false; };
  }, [authSession?.user?.id, sessionId]);

  const grouped = useMemo(() => logs.reduce((result, log) => {
    const name = log.exercise_name || "Exercise";
    if (!result[name]) result[name] = [];
    result[name].push(log);
    return result;
  }, {}), [logs]);
  const completedLogs = logs.filter((log) => !log.skipped);
  const volume = completedLogs.reduce((sum, log) => {
    if (log.actual_unit && log.actual_unit !== "reps") return sum;
    return sum + (Number(log.weight_lbs) || 0) * (Number(log.actual_reps) || 0);
  }, 0);
  const minutes = Math.round((Number(workoutSession?.duration_seconds) || 0) / 60);

  if (loading) return <Center mih="55vh"><Loader color="brand" /></Center>;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!workoutSession) return <Alert color="orange" title="Session not found">It may have been removed, or it doesn't belong to this account.<Button variant="subtle" color="orange" mt="sm" onClick={() => navigate("/history")}>Back to progress</Button></Alert>;

  return (
    <Stack gap={32}>
      <Box>
        <Button component={Link} to="/history" variant="subtle" color="gray" px={0} leftSection={<ArrowLeft size={16} />}>Back to progress</Button>
        <Text className="eyebrow" mt="xl">Completed session</Text>
        <Group justify="space-between" align="flex-end" mt={4}>
          <Box><Title order={1} fz={{ base: 38, md: 50 }} lts={-2}>{workoutSession.workout_type}</Title><Text c="dimmed" mt={5}>{workoutSession.focus}</Text></Box>
          <Badge color="green" variant="light" size="lg" leftSection={<Check size={13} />}>{workoutSession.status}</Badge>
        </Group>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Metric icon={Clock3} label="Duration" value={`${minutes || "<1"} min`} />
        <Metric icon={Weight} label="Training volume" value={`${volume.toLocaleString()} lb`} />
        <Metric icon={Dumbbell} label="Sets completed" value={`${completedLogs.length}`} />
      </SimpleGrid>

      <Paper className="surface" p="lg"><Group gap="sm"><CalendarDays size={17} color="var(--ink-soft)" /><Text size="sm" fw={700}>{formatTimestamp(workoutSession.finished_at || workoutSession.started_at, { year: "numeric", timeZoneName: "short" }, userTimeZone(authSession.user))}</Text></Group></Paper>

      {workoutSession.notes && <Paper className="surface" p="lg"><Text className="eyebrow">Your session note</Text><Text size="sm" mt="sm" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{workoutSession.notes}</Text></Paper>}

      <Box>
        <Text className="eyebrow">Set by set</Text>
        <Stack gap="md" mt="md">
          {Object.entries(grouped).map(([name, exerciseLogs], exerciseIndex) => (
            <Paper key={name} className="surface-raised" p={{ base: "lg", md: "xl" }}>
              <Group justify="space-between" mb="lg"><Group gap="md"><ThemeIcon color="brand" variant="light" radius="md">{String(exerciseIndex + 1).padStart(2, "0")}</ThemeIcon><Box><Title order={3} fz="xl">{name}</Title>{exerciseLogs[0]?.muscle_group && <Text size="xs" c="dimmed">{exerciseLogs[0].muscle_group}</Text>}</Box></Group><Badge variant="outline" color="gray">{exerciseLogs.filter((log) => !log.skipped).length}/{exerciseLogs.length} sets</Badge></Group>
              <Group px="sm" mb="xs"><Text className="eyebrow" w={50}>Set</Text><Text className="eyebrow" style={{ flex: 1 }}>Load</Text><Text className="eyebrow" w={90} ta="right">{formatUnit(exerciseLogs[0]?.actual_unit)}</Text></Group>
              <Divider />
              {exerciseLogs.map((log) => (
                <Group key={log.id || `${name}-${log.set_number}`} px="sm" py="sm" style={{ opacity: log.skipped ? 0.48 : 1, borderBottom: "1px solid var(--line)" }}>
                  <Text fw={800} w={50}>{log.set_number}</Text><Text style={{ flex: 1 }}>{Number(log.weight_lbs) || 0} lb</Text><Box w={90} ta="right">{log.skipped ? <Badge size="xs" color="gray">Skipped</Badge> : <Text fw={800}>{log.actual_value ?? log.actual_reps}</Text>}</Box>
                </Group>
              ))}
            </Paper>
          ))}
          {!logs.length && <Paper className="surface" p="xl"><Text c="dimmed">No set details were saved for this session.</Text></Paper>}
        </Stack>
      </Box>

      <Button component={Link} to="/plan" state={{ day: workoutSession.day }} variant="light" leftSection={<RotateCcw size={17} />}>Open this training day</Button>
    </Stack>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <Paper className="surface" p="lg"><Group gap="xs"><Icon size={15} color="var(--ink-soft)" /><Text className="eyebrow">{label}</Text></Group><Text className="metric-number" fz={28} fw={850} mt="md">{value}</Text></Paper>;
}

function formatUnit(unit) {
  const labels = { seconds: "Seconds", minutes: "Minutes", meters: "Meters", kilometers: "Kilometers", miles: "Miles" };
  return labels[unit] || "Reps";
}
