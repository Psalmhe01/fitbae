import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stack,
  Title,
  Text,
  Paper,
  ThemeIcon,
  Badge,
  Button,
  Group,
  Box,
  Loader,
  Center,
} from "@mantine/core";
import { FileText, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Helper to format date in MM/DD hh:mm AM/PM CST
const formatCST = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  }).formatToParts(date);
  const p = parts.reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${p.month}/${p.day} ${p.hour}:${p.minute} ${p.dayPeriod}`;
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchHistory = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("workout_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("started_at", { ascending: false });
        setHistory(data || []);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    return mins > 0 ? `${mins}m` : `${s}s`;
  };

  if (loading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );

  const empty = history.length === 0;

  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} size="h2" fw={700}>
          History
        </Title>
        <Text c="dimmed" mt={4}>
          Every plan you've ever generated.
        </Text>
      </Box>

      {empty ? (
        <Paper className="glass" radius="32px" p={{ base: "xl", md: 48 }}>
          <Stack align="center" gap="md">
            <ThemeIcon variant="light" size={64} radius="xl">
              <Sparkles size={32} />
            </ThemeIcon>
            <Box ta="center">
              <Title order={3}>No workouts yet</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Start your first session from the dashboard!
              </Text>
            </Box>
            <Button
              radius="xl"
              size="md"
              mt="md"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="sm">
          {history.map((p) => (
            <Paper
              key={p.id}
              className="glass"
              radius="xl"
              onClick={() => navigate(`/history/${p.id}`)}
              p={{ base: "md", sm: "lg" }}
              style={{ transition: "all 0.2s ease", cursor: "pointer" }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group
                  align="center"
                  gap={{ base: "sm", sm: "md" }}
                  style={{ flex: 1, minWidth: 0 }}
                  wrap="nowrap"
                >
                  <ThemeIcon
                    variant="light"
                    size={{ base: 40, sm: 48 }}
                    radius="lg"
                    style={{ flexShrink: 0 }}
                  >
                    <FileText size={20} />
                  </ThemeIcon>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap="xs" mb={2} wrap="nowrap">
                      <Badge
                        variant="light"
                        radius="xl"
                        size="xs"
                        style={{ flexShrink: 0 }}
                      >
                        {p.workout_type}
                      </Badge>
                      <Group gap={4} visibleFrom="xs" wrap="nowrap">
                        <Calendar
                          size={12}
                          color="var(--mantine-color-dimmed)"
                        />
                        <Text c="dimmed" size="xs" truncate>
                          {formatCST(p.finished_at || p.started_at)}
                        </Text>
                      </Group>
                    </Group>
                    <Text size="sm" fw={500} truncate="end">
                      {p.focus}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Duration: {formatDuration(p.duration_seconds || 0)}
                    </Text>
                    <Text c="dimmed" size="xs" hiddenFrom="xs" mt={2}>
                      {formatCST(p.finished_at || p.started_at)}
                    </Text>
                  </Box>
                </Group>
                <Badge color={p.status === "completed" ? "green" : "gray"}>
                  {p.status}
                </Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
