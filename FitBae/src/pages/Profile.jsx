import { useState } from "react";
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
  Divider,
  rem,
} from "@mantine/core";
import { Trash2, Save } from "lucide-react";
import { mockUser, equipmentCategories } from "@/lib/mock-data";

export default function ProfilePage() {
  const [frequency, setFrequency] = useState([mockUser.frequency]);
  const [equipment, setEquipment] = useState([
    "Olympic Barbell",
    "Adjustable Dumbbells",
    "Commercial Gym Access",
  ]);

  const toggle = (item) =>
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );

  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} size="h2" fw={700}>
          Profile & Settings
        </Title>
        <Text c="dimmed" mt={4}>
          Update your details — your plan adapts automatically.
        </Text>
      </Box>

      {/* Personal Info */}
      <Section title="Personal Info" desc="The basics about you.">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <TextInput
            label="Name"
            defaultValue={mockUser.name}
          />
          <NumberInput label="Age" defaultValue={28} />
          <NumberInput
            label="Weight (lbs)"
            defaultValue={175}
          />
          <Field label="Height">
            <Group grow gap="xs">
              <NumberInput defaultValue={5} placeholder="ft" />
              <NumberInput defaultValue={10} placeholder="in" />
            </Group>
          </Field>
        </SimpleGrid>
      </Section>

      {/* Fitness Profile */}
      <Section title="Fitness Profile" desc="What you're training for.">
        <Stack gap="xl">
          <Field label="Goal">
            <SegmentedControl
              fullWidth
              defaultValue="muscle"
              data={[
                { label: "Muscle", value: "muscle" },
                { label: "Weight", value: "lose" },
                { label: "Flex", value: "flexibility" },
                { label: "Endurance", value: "endurance" },
                { label: "Maintain", value: "maintain" },
              ]}
            />
          </Field>

          <Field
            label={`Frequency — ${frequency[0]} day${frequency[0] > 1 ? "s" : ""}/week`}
          >
            <Box px="md">
              <Slider
                min={1}
                max={6}
                step={1}
                value={frequency[0]}
                onChange={(v) => setFrequency([v])}
                label={null}
                marks={[1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: v }))}
              />
            </Box>
          </Field>

          <Field label="Workout duration">
            <SegmentedControl
              fullWidth
              defaultValue="60"
              data={["30", "45", "60", "90"].map((v) => ({
                label: `${v} min`,
                value: v,
              }))}
            />
          </Field>

          <Field label="Experience">
            <SegmentedControl
              fullWidth
              defaultValue="intermediate"
              data={["beginner", "intermediate", "advanced"].map((v) => ({
                label: v.charAt(0).toUpperCase() + v.slice(1),
                value: v,
              }))}
            />
          </Field>

          <Field label="Equipment">
            <Stack gap="lg">
              {Object.entries(equipmentCategories).map(([category, items]) => (
                <Box key={category}>
                  <Text c="dimmed" size="xs" fw={700} tt="uppercase" mb="xs">
                    {category}
                  </Text>
                  <Group gap={8}>
                    {items.map((item) => {
                      const active = equipment.includes(item);
                      return (
                        <Chip
                          key={item}
                          checked={active}
                          onChange={() => toggle(item)}
                          size="sm"
                        >
                          {item}
                        </Chip>
                      );
                    })}
                  </Group>
                </Box>
              ))}
            </Stack>
          </Field>
        </Stack>
      </Section>

      <Group justify="flex-end">
        <Button
          onClick={() => console.log("Changes saved")}
          size="md"
          radius="xl"
          leftSection={<Save size={18} />}
          className="shadow-glow"
        >
          Save Changes
        </Button>
      </Group>

      {/* Danger zone */}
      <Paper
        p="xl"
        variant="outline"
        style={{
          backgroundColor: "var(--mantine-color-red-light)",
          border: "1px solid var(--mantine-color-red-light-hover)",
        }}
      >
        <Title order={3} c="red" size="h4">
          Danger Zone
        </Title>
        <Text c="dimmed" size="sm" mt={4}>
          Permanently delete your account and all generated plans. This cannot
          be undone.
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

function Section({ title, desc, children }) {
  return (
    <Paper className="glass" radius="32px" p={{ base: "xl", md: 32 }}>
      <Box mb="xl">
        <Title order={2} size="h3">
          {title}
        </Title>
        <Text c="dimmed" size="sm">
          {desc}
        </Text>
      </Box>
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
