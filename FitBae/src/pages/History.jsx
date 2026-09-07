import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Alert, Badge, Box, Center, Group, Loader, Paper, SimpleGrid, Stack,
  Text, ThemeIcon, Title,
} from "@mantine/core";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Dumbbell, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric", year: "numeric",
}).format(new Date(value)) : "Date unavailable";

const formatDuration = (seconds = 0) => {
  const mins = Math.round(Number(seconds) / 60);
  return mins < 1 ? "<1 min" : `${mins} min`;
};

export default function HistoryPage() {
  const { session } = useOutletContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    supabase.from("workout_sessions").select("*")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(100)
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError("We couldn't load your workout history.");
        setHistory(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [session?.user?.id]);

  const summary = useMemo(() => ({
    completed: history.filter((item) => item.status === "completed").length,
    minutes: Math.round(history.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0), 0) / 60),
    latest: history.find((item) => item.status === "completed")?.finished_at,
  }), [history]);

  return (
    <Stack gap={32}>
      <Box><Text className="eyebrow">The work adds up</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Progress</Title><Text c="dimmed" mt="xs">Every completed session, with the numbers you actually logged.</Text></Box>

      {error && <Alert color="red">{error}</Alert>}
      {loading ? <Center mih="45vh"><Loader color="brand" /></Center> : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Summary icon={CheckCircle2} label="Completed" value={summary.completed} suffix="sessions" />
            <Summary icon={Clock3} label="Training time" value={summary.minutes} suffix="minutes" />
            <Summary icon={CalendarDays} label="Last trained" value={summary.latest ? formatDate(summary.latest).split(",")[0] : "—"} compact />
          </SimpleGrid>

          <Box>
            <Group justify="space-between" mb="md"><Title order={2} fz={26}>Session log</Title><Badge variant="outline" color="gray">{history.length}{history.length === 100 ? " recent" : " total"}</Badge></Group>
            {history.length ? (
              <Stack gap="sm">
                {history.map((item) => (
                  <Paper
                    component={Link}
                    to={`/history/${item.id}`}
                    key={item.id}
                    className="surface"
                    p={{ base: "md", sm: "lg" }}
                    style={{ color: "inherit", textDecoration: "none", display: "block" }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
                        <ThemeIcon variant="light" color={item.status === "completed" ? "brand" : "gray"} size={46} radius="md"><Dumbbell size={20} /></ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                          <Group gap="xs"><Text fw={800} truncate>{item.workout_type || "Workout"}</Text><Badge size="xs" variant="light" color={item.status === "completed" ? "green" : "gray"}>{item.status}</Badge></Group>
                          <Text size="sm" c="dimmed" truncate>{item.focus || "General training"}</Text>
                          <Text size="xs" c="dimmed" mt={4}>{formatDate(item.finished_at || item.started_at)} · {formatDuration(item.duration_seconds)}</Text>
                        </Box>
                      </Group>
                      <ArrowUpRight size={19} color="var(--ink-soft)" />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper className="surface-raised" p={{ base: "xl", md: 48 }}>
                <ThemeIcon variant="light" color="brand" size={54}><TrendingUp size={25} /></ThemeIcon>
                <Title order={3} mt="lg">Your first entry starts with one set.</Title>
                <Text c="dimmed" mt="xs">Start a workout from Today. Once you finish, the honest numbers will live here.</Text>
              </Paper>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}

function Summary({ icon: Icon, label, value, suffix, compact }) {
  return <Paper className="surface" p="lg"><Group gap="xs"><Icon size={15} color="var(--ink-soft)" /><Text className="eyebrow">{label}</Text></Group><Text className="metric-number" fw={850} fz={compact ? 22 : 34} mt="md">{value}</Text>{suffix && <Text c="dimmed" size="xs">{suffix}</Text>}</Paper>;
}
