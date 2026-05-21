import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Button,
  Box,
  Loader,
  Image,
  Center,
  ThemeIcon,
  Divider,
  Badge,
  Anchor,
} from "@mantine/core";
import { ArrowLeft, Calendar, Clock, Dumbbell, Activity } from "lucide-react";
import { getEquipmentById } from "@/lib/equipmentLibrary";
import { supabase } from "@/lib/supabase";

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [sessionRes, logsRes] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select("*")
          .eq("id", sessionId)
          .single(),
        supabase
          .from("exercise_logs")
          .select("*")
          .eq("session_id", sessionId)
          .order("completed_at", { ascending: true }),
      ]);

      if (sessionRes.data) setSession(sessionRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [sessionId]);

  if (loading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );
  if (!session)
    return (
      <Center h="50vh">
        <Text>Session not found.</Text>
      </Center>
    );

  // Group logs by exercise name
  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.exercise_name]) acc[log.exercise_name] = [];
    acc[log.exercise_name].push(log);
    return acc;
  }, {});

  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Stack gap="xl">
      <Box>
        <Anchor
          component={Link}
          to="/history"
          size="sm"
          mb="xs"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={14} /> Back to History
        </Anchor>
        <Title order={1} size="h2">
          {session.workout_type}
        </Title>
        <Text c="dimmed">{session.focus}</Text>
      </Box>

      <Paper className="glass" p="lg" radius="xl">
        <Group grow>
          <Box>
            <Group gap={6} mb={4}>
              <Calendar size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Date
              </Text>
            </Group>
            <Text fw={600}>
              {new Date(session.started_at).toLocaleDateString()}
            </Text>
          </Box>
          <Box>
            <Group gap={6} mb={4}>
              <Clock size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Duration
              </Text>
            </Group>
            <Text fw={600}>{formatDuration(session.duration_seconds)}</Text>
          </Box>
          <Box>
            <Group gap={6} mb={4}>
              <Activity size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Status
              </Text>
            </Group>
            <Badge color="green" variant="light">
              {session.status}
            </Badge>
          </Box>
        </Group>
      </Paper>

      <Stack gap="md">
        {Object.entries(groupedLogs).map(([name, exerciseLogs]) => (
          <Paper key={name} className="glass" p="xl" radius="32px">
            <Group justify="space-between" align="flex-start" mb="md">
              <Group align="center">
                {exerciseLogs[0]?.equipment_id && (
                  <Image
                    src={
                      getEquipmentById(exerciseLogs[0].equipment_id)?.image_url
                    }
                    alt={getEquipmentById(exerciseLogs[0].equipment_id)?.name}
                    w={40}
                    h={40}
                    fallbackSrc="https://placehold.co/40?text=?"
                    style={{ objectFit: "contain" }}
                  />
                )}
                <Title order={3} size="h4">
                  {name}
                </Title>
              </Group>
              {exerciseLogs[0]?.muscle_group && (
                <Badge variant="light" size="sm">
                  {exerciseLogs[0].muscle_group}
                </Badge>
              )}
            </Group>
            <Stack gap="xs">
              <Group px="xs">
                <Text size="xs" fw={700} c="dimmed" style={{ width: 40 }}>
                  SET
                </Text>
                <Text size="xs" fw={700} c="dimmed" style={{ flex: 1 }}>
                  WEIGHT
                </Text>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  style={{ width: 60 }}
                  ta="right"
                >
                  REPS
                </Text>
              </Group>
              <Divider opacity={0.3} />
              {exerciseLogs.map((log) => (
                <Group
                  key={log.id}
                  px="xs"
                  py={4}
                  style={{ opacity: log.skipped ? 0.5 : 1 }}
                >
                  <Text size="sm" fw={700} style={{ width: 40 }}>
                    {log.set_number}
                  </Text>
                  <Group gap={4} style={{ flex: 1 }}>
                    <Dumbbell
                      size={14}
                      color="var(--mantine-color-primary-filled)"
                    />
                    <Text size="sm" fw={600}>
                      {log.weight_lbs} lbs
                    </Text>
                  </Group>
                  <Box style={{ width: 60 }} ta="right">
                    {log.skipped ? (
                      <Badge size="xs" color="gray">
                        SKIPPED
                      </Badge>
                    ) : (
                      <Text size="sm" fw={700}>
                        {log.actual_reps}
                      </Text>
                    )}
                  </Box>
                </Group>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>

      {session.notes && (
        <Paper className="glass" p="lg" radius="xl">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="xs">
            Session Notes
          </Text>
          <Text size="sm">{session.notes}</Text>
        </Paper>
      )}
    </Stack>
  );
}
