import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Center, Group, Loader, Paper,
  SimpleGrid, Stack, Text, ThemeIcon, Title,
} from "@mantine/core";
import { Activity, ArrowRight, Award, CalendarDays, Clock3, Dumbbell, Settings2, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFitnessGoal } from "@/lib/fitnessConfig";
import { ProfileAvatar } from "@/components/ProfileAvatar";

const dateLabel = (value) => new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", year: "numeric",
}).format(new Date(value));

const durationLabel = (seconds = 0) => {
  const minutes = Math.round(Number(seconds) / 60);
  return minutes < 1 ? "<1 min" : `${minutes} min`;
};

function startOfWeek(daysAgo = 6) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function ProfilePage() {
  const { profile, session } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    supabase.from("workout_sessions")
      .select("id,workout_type,focus,duration_seconds,finished_at,status,exercise_logs(weight_lbs,actual_reps,skipped)")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .order("finished_at", { ascending: false })
      .limit(30)
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError("Your training history couldn't be loaded.");
        setSessions(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [session?.user?.id]);

  const summary = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0), 0);
    const volume = sessions.reduce((sum, item) => sum + (item.exercise_logs || []).reduce((setSum, log) => {
      if (log.skipped) return setSum;
      return setSum + (Number(log.weight_lbs) || 0) * (Number(log.actual_reps) || 0);
    }, 0), 0);
    return { workouts: sessions.length, minutes: Math.round(totalSeconds / 60), volume };
  }, [sessions]);

  const weekData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek());
      date.setDate(date.getDate() + index);
      const key = formatter.format(date);
      const daySessions = sessions.filter((item) => item.finished_at && formatter.format(new Date(item.finished_at)) === key);
      return {
        label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date),
        minutes: Math.round(daySessions.reduce((sum, item) => sum + (Number(item.duration_seconds) || 0), 0) / 60),
      };
    });
  }, [sessions]);
  const maxMinutes = Math.max(1, ...weekData.map((item) => item.minutes));

  return (
    <Stack gap={32}>
      <Group justify="space-between" align="flex-end">
        <Box><Text className="eyebrow">Your training identity</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Profile</Title></Box>
        <Button component={Link} to="/settings" variant="light" leftSection={<Settings2 size={17} />}>Edit preferences</Button>
      </Group>

      <Paper className="surface-raised" p={{ base: "xl", md: 32 }}>
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="lg">
            <ProfileAvatar user={session?.user} name={profile?.name} size={82} radius={24} />
            <Box>
              <Title order={2} fz={30}>{profile?.name}</Title>
              <Text c="dimmed" mt={3}>{session?.user?.email}</Text>
              <Group gap="xs" mt="sm">
                <Badge variant="light" color="brand">{profile?.experience_level}</Badge>
                <Badge variant="outline" color="gray">{profile?.gym_frequency} days / week</Badge>
              </Group>
            </Box>
          </Group>
          <ThemeIcon size={54} color="brand" c="dark.9" radius="xl"><Dumbbell size={25} /></ThemeIcon>
        </Group>
      </Paper>

      {error && <Alert color="orange">{error}</Alert>}
      {loading ? <Center py="xl"><Loader color="brand" /></Center> : (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Stat icon={Activity} label="Recent sessions" value={summary.workouts} />
          <Stat icon={Clock3} label="Minutes trained" value={summary.minutes} />
          <Stat icon={Award} label="Volume moved" value={summary.volume.toLocaleString()} suffix="lb" />
          <Stat icon={Target} label="Current goal" value={getFitnessGoal(profile?.fitness_goal)?.label || "Not set"} compact />
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, md: 5 }} spacing="lg">
        <Paper className="surface profile-chart" p="xl">
          <Group justify="space-between" mb="xl">
            <Box><Text className="eyebrow">Last 7 days</Text><Title order={2} fz="xl" mt={4}>Training minutes</Title></Box>
            <CalendarDays size={20} color="var(--ink-soft)" />
          </Group>
          <Group align="flex-end" justify="space-around" h={190} gap="sm" wrap="nowrap">
            {weekData.map((item, index) => (
              <Stack key={`${item.label}-${index}`} align="center" justify="flex-end" gap={7} h="100%" style={{ flex: 1 }}>
                <Text size="xs" fw={800}>{item.minutes || ""}</Text>
                <Box
                  role="img"
                  aria-label={`${item.minutes} training minutes`}
                  w="100%"
                  maw={44}
                  h={`${Math.max(6, (item.minutes / maxMinutes) * 140)}px`}
                  bg={item.minutes ? "var(--brand)" : "var(--surface-muted)"}
                  style={{ borderRadius: "8px 8px 2px 2px", transition: "height 200ms ease" }}
                />
                <Text size="xs" c="dimmed" fw={700}>{item.label}</Text>
              </Stack>
            ))}
          </Group>
        </Paper>

        <Paper className="surface profile-settings" p="xl">
          <Text className="eyebrow">Current setup</Text>
          <Stack mt="xl" gap="lg">
            <InfoRow label="Goal" value={getFitnessGoal(profile?.fitness_goal)?.label || "Not set"} />
            <InfoRow label="Experience" value={profile?.experience_level} />
            <InfoRow label="Session target" value={`${profile?.workout_duration} minutes`} />
            <InfoRow label="Equipment" value={`${profile?.equipment?.length || 0} items`} />
          </Stack>
          <Button component={Link} to="/settings" variant="subtle" px={0} mt="xl" rightSection={<ArrowRight size={15} />}>Change setup</Button>
        </Paper>
      </SimpleGrid>

      <Box>
        <Group justify="space-between" mb="md"><Box><Text className="eyebrow">Recent work</Text><Title order={2} fz={28} mt={4}>Workout history</Title></Box><Button component={Link} to="/history" variant="subtle" rightSection={<ArrowRight size={16} />}>View all</Button></Group>
        <Stack gap="sm">
          {sessions.slice(0, 3).map((item) => (
            <UnstyledSession key={item.id} session={item} />
          ))}
          {!sessions.length && <Paper className="surface" p="xl"><Text c="dimmed">Complete your first workout and it will show up here.</Text></Paper>}
        </Stack>
      </Box>
    </Stack>
  );
}

function Stat({ icon: Icon, label, value, suffix, compact }) {
  return <Paper className="surface" p="lg"><Group gap={7}><Icon size={15} color="var(--ink-soft)" /><Text className="eyebrow">{label}</Text></Group><Text className="metric-number" fz={compact ? 20 : 31} fw={850} mt="md" tt={compact ? "capitalize" : undefined}>{value}</Text>{suffix && <Text size="xs" c="dimmed">{suffix}</Text>}</Paper>;
}

function InfoRow({ label, value }) {
  return <Group justify="space-between"><Text size="sm" c="dimmed">{label}</Text><Text size="sm" fw={750} tt="capitalize">{value}</Text></Group>;
}

function UnstyledSession({ session }) {
  return (
    <Paper component={Link} to={`/history/${session.id}`} className="surface" p="lg" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap"><ThemeIcon variant="light" color="brand"><Dumbbell size={16} /></ThemeIcon><Box style={{ minWidth: 0 }}><Text fw={750} truncate>{session.workout_type}</Text><Text size="xs" c="dimmed" truncate>{session.focus || dateLabel(session.finished_at)}</Text></Box></Group>
        <Box ta="right"><Text size="sm" fw={750}>{durationLabel(session.duration_seconds)}</Text><Text size="xs" c="dimmed">{dateLabel(session.finished_at)}</Text></Box>
      </Group>
    </Paper>
  );
}
