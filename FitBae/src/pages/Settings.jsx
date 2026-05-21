import { useState, useEffect } from "react";
import {
  Stack,
  Title,
  Text,
  Paper,
  SimpleGrid,
  TextInput,
  NumberInput,
  Button,
  SegmentedControl,
  Slider,
  Box,
  Group,
  Chip,
  rem,
  Loader,
  Center,
  Image,
  Avatar,
  Anchor,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { Trash2, Save, ArrowLeft } from "lucide-react";
import { equipmentCategories } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { equipmentLibrary, getEquipmentById } from "@/lib/equipmentLibrary";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", profile.user_id);

    if (error) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } else {
      notifications.show({
        title: "Success",
        message: "Profile updated!",
        color: "green",
      });
    }
    setSaving(false);
  };

  if (loading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );
  if (!profile) return <Text>No profile found.</Text>;

  const toggle = (item) =>
    setProfile((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((x) => x !== item)
        : [...prev.equipment, item],
    }));

  return (
    <Stack gap="xl">
      <Box>
        <Anchor
          component={Link}
          to="/profile"
          size="sm"
          mb="sm"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={14} /> Back to Profile
        </Anchor>
        <Title order={1} size="h2" fw={700}>
          Settings
        </Title>
        <Text c="dimmed">
          Manage your personal information and fitness preferences.
        </Text>
      </Box>

      <Section title="Personal Info">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <TextInput
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <NumberInput
            label="Age"
            value={profile.age}
            onChange={(val) => setProfile({ ...profile, age: val })}
          />
          <NumberInput
            label="Weight (lbs)"
            value={profile.weight}
            onChange={(val) => setProfile({ ...profile, weight: val })}
          />
          <NumberInput
            label="Height (cm)"
            value={profile.height_cm}
            onChange={(val) => setProfile({ ...profile, height_cm: val })}
          />
        </SimpleGrid>
      </Section>

      <Section title="Fitness Goals">
        <Stack gap="xl">
          <Field label="Goal">
            <SegmentedControl
              fullWidth
              value={profile.fitness_goal}
              onChange={(v) => setProfile({ ...profile, fitness_goal: v })}
              data={["muscle", "lose", "flexibility", "endurance", "maintain"]}
            />
          </Field>
          <Field label={`Frequency — ${profile.gym_frequency} days/week`}>
            <Slider
              min={1}
              max={6}
              step={1}
              value={profile.gym_frequency}
              onChange={(v) => setProfile({ ...profile, gym_frequency: v })}
            />
          </Field>
          <Field label="Experience">
            <SegmentedControl
              fullWidth
              value={profile.experience_level}
              onChange={(v) => setProfile({ ...profile, experience_level: v })}
              data={["beginner", "intermediate", "advanced"]}
            />
          </Field>
        </Stack>
      </Section>

      <Section title="Equipment">
        <Stack gap="lg">
          {Object.entries(equipmentCategories).map(([category, items]) => (
            <Box key={category}>
              <Text c="dimmed" size="xs" fw={700} tt="uppercase" mb="xs">
                {category}
              </Text>
              <Group gap={8}>
                {items.map((item) => {
                  const equip = getEquipmentById(item.id);
                  return (
                    <Chip
                      key={item.id}
                      checked={profile.equipment.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      size="sm"
                    >
                      <Group gap={6} wrap="nowrap">
                        {equip?.image_url && (
                          <Avatar src={equip.image_url} size="xs" radius="xs" />
                        )}
                        {item.name}
                      </Group>
                    </Chip>
                  );
                })}
              </Group>
            </Box>
          ))}
        </Stack>
      </Section>

      <Group justify="flex-end">
        <Button
          onClick={handleSave}
          size="md"
          radius="xl"
          leftSection={<Save size={18} />}
          loading={saving}
        >
          Save Changes
        </Button>
      </Group>

      <Paper
        p="xl"
        style={{ backgroundColor: "var(--mantine-color-red-light)" }}
      >
        <Title order={3} c="red" size="h4">
          Danger Zone
        </Title>
        <Text size="sm" mt={4}>
          Permanently delete your account. This cannot be undone.
        </Text>
        <Button
          variant="light"
          color="red"
          mt="lg"
          radius="xl"
          leftSection={<Trash2 size={18} />}
        >
          Delete Account
        </Button>
      </Paper>
    </Stack>
  );
}

function Section({ title, children }) {
  return (
    <Paper className="glass" radius="32px" p="xl">
      <Title order={2} size="h3" mb="xl">
        {title}
      </Title>
      {children}
    </Paper>
  );
}

function Field({ label, children }) {
  return (
    <Stack gap={8}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {children}
    </Stack>
  );
}
