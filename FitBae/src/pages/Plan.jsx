import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dumbbell, Coffee } from "lucide-react";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  ThemeIcon,
  Divider,
  Anchor,
  Center,
  Box,
  Loader,
  Image,
  rem,
} from "@mantine/core";
import { getEquipmentById } from "@/lib/equipmentLibrary";

export default function PlanPage() {
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlan = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return navigate("/");

      const { data } = await supabase
        .from("workout_plans")
        .select("plan_json")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setPlan(data.plan_json.weekly_schedule || []);
      setLoading(false);
    };
    fetchPlan();
  }, [navigate]);

  if (loading) {
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <Title order={1} size="h2" fw={700}>
          My Plan
        </Title>
        <Text c="dimmed">Your current 7-day program, in detail.</Text>
      </Stack>

      <Stack gap="md">
        {plan.map((d) => (
          <Paper
            key={d.day}
            className="glass"
            radius="xl"
            p={{ base: "lg", md: "xl" }}
          >
            <Group justify="space-between" mb="lg">
              <Group gap="md">
                <ThemeIcon variant="light" size="lg" radius="md">
                  {d.rest ? <Coffee size={20} /> : <Dumbbell size={20} />}
                </ThemeIcon>
                <Stack gap={0}>
                  <Text
                    c="dimmed"
                    size="xs"
                    fw={700}
                    tt="uppercase"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {d.day}
                  </Text>
                  <Title order={3} size="h4">
                    {d.type}
                  </Title>
                </Stack>
              </Group>
              <Badge
                variant="light"
                color={d.rest ? "gray" : "primary"}
                radius="xl"
              >
                {d.rest ? "Rest" : "Active"}
              </Badge>
            </Group>

            {d.rest ? (
              <Text c="dimmed" size="sm">
                Recovery day — stretch and hydrate.
              </Text>
            ) : (
              <Stack gap={0}>
                {d.exercises.map((ex, index) => (
                  <Box key={ex.name}>
                    {index !== 0 && (
                      <Divider my="sm" variant="dashed" opacity={0.4} />
                    )}
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ minWidth: 0 }}>
                        {ex.equipment_id && (
                          <Image
                            src={getEquipmentById(ex.equipment_id)?.image_url}
                            alt={getEquipmentById(ex.equipment_id)?.name}
                            w={40}
                            h={40}
                            fit="contain"
                            mb="sm"
                            fallbackSrc="https://placehold.co/40?text=?"
                          />
                        )}
                        <Text size="sm" fw={600} truncate="end">
                          {ex.name}
                        </Text>
                        <Group gap={8}>
                          <Text c="dimmed" size="xs">
                            rest {ex.rest_seconds}s
                          </Text>
                          {ex.muscle_group && (
                            <Text size="xs" c="primary" fw={600}>
                              • {ex.muscle_group}
                            </Text>
                          )}
                        </Group>
                        {ex.instructions && (
                          <Box mt="xs">
                            <Stack gap={2}>
                              {ex.instructions.map((step, idx) => (
                                <Text key={idx} size="xs" c="dimmed" lh={1.3}>
                                  • {step}
                                </Text>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                      <Text
                        size="sm"
                        fw={700}
                        style={{
                          color: "var(--mantine-color-primary-filled)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ex.sets} × {ex.reps}
                      </Text>
                    </Group>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        ))}
      </Stack>

      <Center>
        <Anchor component={Link} to="/dashboard" size="sm">
          ← Back to dashboard
        </Anchor>
      </Center>
    </Stack>
  );
}
