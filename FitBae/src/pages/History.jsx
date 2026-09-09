import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Center, Group, Loader, Paper, Select, SimpleGrid, Stack,
  Text, TextInput, ThemeIcon, Title,
} from "@mantine/core";
import { ArrowUpRight, Award, CalendarDays, CheckCircle2, Clock3, Download, Dumbbell, Search, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatTimestamp, timestampMs, userTimeZone } from "@/lib/dates";
import { personalBests, sessionsCsv } from "@/lib/training";
import { exportCsv } from "@/lib/exportFile";

const formatDuration = (seconds = 0) => {
  const mins = Math.round(Number(seconds) / 60);
  return mins < 1 ? "<1 min" : `${mins} min`;
};

export default function HistoryPage() {
  const { session } = useOutletContext();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const zone = userTimeZone(session.user);
  const formatDate = (value) => formatTimestamp(value, { weekday: "short", year: "numeric", hour: undefined, minute: undefined }, zone);
  const query = useCallback(() => supabase.from("workout_sessions")
    .select("*,exercise_logs(exercise_name,equipment_id,set_number,weight_lbs,actual_reps,actual_value,actual_unit,skipped)")
    .eq("user_id", session.user.id).eq("status", "completed")
    .order("finished_at", { ascending: false }).order("id", { ascending: false }), [session.user.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    setLoading(true); setError("");
    query().range(0, 29)
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError("We couldn't load your workout history.");
        setHistory(data || []);
        setHasMore(data?.length === 30);
        setLoading(false);
      }).catch(() => { if (active) { setError("Your history couldn't be reached. Please retry."); setLoading(false); } });
    return () => { active = false; };
  }, [query, retry, session?.user?.id]);

  const loadMore = async () => {
    setLoadingMore(true); setError("");
    try {
      const { data, error: fetchError } = await query().range(history.length, history.length + 29);
      if (fetchError) throw fetchError;
      setHistory((current) => [...new Map([...current, ...(data || [])].map((item) => [item.id, item])).values()]);
      setHasMore(data?.length === 30);
    } catch { setError("Older sessions couldn't load. Please retry."); }
    finally { setLoadingMore(false); }
  };
  const filtered = useMemo(() => {
    const after = period === "all" ? 0 : Date.now() - Number(period) * 86_400_000;
    const term = search.trim().toLowerCase();
    return history.filter((item) => timestampMs(item.finished_at || item.started_at) >= after &&
      (!term || [item.workout_type, item.focus, item.notes, ...(item.exercise_logs || []).map((log) => log.exercise_name)].some((value) => String(value || "").toLowerCase().includes(term))));
  }, [history, period, search]);
  const bests = useMemo(() => personalBests(filtered).slice(0, 6), [filtered]);
  const exportHistory = async () => {
    if (exporting) return;
    setExporting(true); setExportError("");
    try {
      await exportCsv(sessionsCsv(filtered), `fitbae-workouts-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch { setExportError("Your export couldn't be opened. Please try again."); }
    finally { setExporting(false); }
  };

  const summary = useMemo(() => ({
    completed: filtered.length,
    minutes: Math.round(filtered.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0), 0) / 60),
    latest: filtered[0]?.finished_at,
  }), [filtered]);

  return (
    <Stack gap={32}>
      <Box><Text className="eyebrow">The work adds up</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Progress</Title><Text c="dimmed" mt="xs">Every completed session, with the numbers you actually logged.</Text></Box>

      {error && <Alert color="red">{error}<Button variant="subtle" color="red" onClick={() => setRetry((value) => value + 1)}>Retry</Button></Alert>}
      {exportError && <Alert color="red" role="alert">{exportError}</Alert>}
      {loading ? <Center mih="45vh"><Loader color="brand" /></Center> : (
        <>
          <Paper className="surface" p="lg"><SimpleGrid cols={{ base: 1, sm: 2 }}><TextInput label="Search loaded sessions" placeholder="Exercise, workout, or session note" value={search} onChange={(e) => setSearch(e.currentTarget.value)} leftSection={<Search size={16} />} /><Select label="Time period" allowDeselect={false} value={period} onChange={(value) => setPeriod(value || "all")} data={[{ value: "all", label: "All loaded sessions" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }]} /></SimpleGrid><Group justify="space-between" mt="md"><Text size="xs" c="dimmed" maw={600}>{history.length} sessions loaded. Summaries, best sets, search and export use the {filtered.length} shown sessions{hasMore ? "; load older sessions below to include more" : ""}.</Text><Button variant="light" leftSection={<Download size={16} />} onClick={exportHistory} disabled={!filtered.length}>Export shown sessions</Button></Group></Paper>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Summary icon={CheckCircle2} label="Completed" value={summary.completed} suffix="sessions" />
            <Summary icon={Clock3} label="Training time" value={summary.minutes} suffix="minutes" />
            <Summary icon={CalendarDays} label="Last trained" value={summary.latest ? formatDate(summary.latest).split(",")[0] : "—"} compact />
          </SimpleGrid>

          {bests.length > 0 && <Box><Group mb="md"><Award size={21} color="var(--brand-strong)" /><Title order={2} fz={25}>Best sets in this view</Title></Group><SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }}>{bests.map((best) => <Paper key={best.key} className="surface" p="lg"><Text fw={800}>{best.name}</Text><Text className="metric-number" fz={25} fw={850} mt="sm">{best.weight} lb × {best.reps}</Text><Text size="xs" c="dimmed" mt={4}>{formatDate(best.date)}</Text></Paper>)}</SimpleGrid></Box>}

          <Box>
            <Group justify="space-between" mb="md"><Title order={2} fz={26}>Session log</Title><Badge variant="outline" color="gray">{filtered.length} shown</Badge></Group>
            {filtered.length ? (
              <Stack gap="sm">
                {filtered.map((item) => (
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
                <Title order={3} mt="lg">{history.length ? "No sessions match this view." : "Your first entry starts with one set."}</Title>
                <Text c="dimmed" mt="xs">{history.length ? "Try another search, change the period, or load older sessions." : "Start a workout from Today. Once you finish, the honest numbers will live here."}</Text>
              </Paper>
            )}
            {hasMore && <Button variant="light" fullWidth mt="lg" onClick={loadMore} loading={loadingMore}>Load older sessions</Button>}
          </Box>
        </>
      )}
    </Stack>
  );
}

function Summary({ icon: Icon, label, value, suffix, compact }) {
  return <Paper className="surface" p="lg"><Group gap="xs"><Icon size={15} color="var(--ink-soft)" /><Text className="eyebrow">{label}</Text></Group><Text className="metric-number" fw={850} fz={compact ? 22 : 34} mt="md">{value}</Text>{suffix && <Text c="dimmed" size="xs">{suffix}</Text>}</Paper>;
}
