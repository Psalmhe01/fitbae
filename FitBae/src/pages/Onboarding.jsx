import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Progress,
  Paper,
  TextInput,
  NumberInput,
  SegmentedControl,
  Button,
  SimpleGrid,
  Box,
  ThemeIcon,
  Slider,
  Chip,
  UnstyledButton,
  rem,
} from "@mantine/core";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/lib/theme";
import { equipmentCategories } from "@/lib/mock-data";
import {
  ArrowLeft,
  ArrowRight,
  Dumbbell,
  Flame,
  Sparkles,
  Activity,
  Scale,
  Heart,
  Check,
} from "lucide-react";

const goals = [
  { id: "muscle", label: "Build Muscle", icon: Dumbbell },
  { id: "lose", label: "Lose Weight", icon: Flame },
  { id: "flex", label: "Improve Flexibility", icon: Heart },
  { id: "endurance", label: "Increase Endurance", icon: Activity },
  { id: "maintain", label: "Maintain Fitness", icon: Scale },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [heightUnit, setHeightUnit] = useState("ft");
  const [sex, setSex] = useState("male");
  const [goal, setGoal] = useState("muscle");
  const [equipment, setEquipment] = useState(["Full Gym"]);
  const [frequency, setFrequency] = useState([4]);
  const [duration, setDuration] = useState("60");
  const [experience, setExperience] = useState("intermediate");

  const toggleEquipment = (e) =>
    setEquipment((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );

  return (
    <Box className="bg-hero" style={{ minHeight: "100vh" }} py={32} px="md">
      <Container size={rem(672)}>
        <Group justify="space-between" mb="lg">
          <Button
            component={Link}
            to="/"
            variant="transparent"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
            px={0}
          >
            Back
          </Button>
          <ThemeToggle />
        </Group>

        <Box mb={32}>
          <Text
            c="dimmed"
            size="xs"
            fw={600}
            tt="uppercase"
            mb={8}
            style={{ letterSpacing: "0.05em" }}
          >
            Step {step} of 2
          </Text>
          <Progress
            value={step === 1 ? 50 : 100}
            size="xs"
            radius="xl"
            transitionDuration={500}
          />
        </Box>

        <Paper
          className="glass shadow-glow"
          radius="32px"
          p={{ base: "xl", md: 40 }}
        >
          {step === 1 ? (
            <>
              <Title order={1} size="h2" fw={700}>
                Personal info
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                Let's get to know you.
              </Text>

              <Stack mt={32} gap="xl">
                <TextInput
                  label="Name"
                  defaultValue="Alex Carter"
                  size="md"
                  radius="md"
                />
                <NumberInput
                  label="Age"
                  defaultValue={28}
                  size="md"
                  radius="md"
                />

                <Field label="Biological sex">
                  <SegmentedControl
                    value={sex}
                    onChange={setSex}
                    data={[
                      { label: "Male", value: "male" },
                      { label: "Female", value: "female" },
                    ]}
                    fullWidth
                    size="md"
                  />
                </Field>

                <Field label="Weight">
                  <Group grow gap="xs">
                    <NumberInput
                      defaultValue={weightUnit === "lbs" ? 175 : 80}
                      size="md"
                      radius="md"
                      style={{ flex: 1 }}
                    />
                    <SegmentedControl
                      value={weightUnit}
                      onChange={setWeightUnit}
                      data={["lbs", "kg"]}
                      size="md"
                      style={{ width: rem(120) }}
                    />
                  </Group>
                </Field>

                <Field label="Height">
                  <Group grow gap="xs">
                    {heightUnit === "ft" ? (
                      <>
                        <NumberInput
                          defaultValue={5}
                          placeholder="ft"
                          size="md"
                          radius="md"
                        />
                        <NumberInput
                          defaultValue={10}
                          placeholder="in"
                          size="md"
                          radius="md"
                        />
                      </>
                    ) : (
                      <NumberInput
                        defaultValue={178}
                        placeholder="cm"
                        size="md"
                        radius="md"
                      />
                    )}
                    <SegmentedControl
                      value={heightUnit}
                      onChange={setHeightUnit}
                      data={["ft", "cm"]}
                      size="md"
                      style={{ width: rem(120) }}
                    />
                  </Group>
                </Field>
              </Stack>

              <Button
                onClick={() => setStep(2)}
                fullWidth
                size="lg"
                radius="xl"
                mt={40}
                rightSection={<ArrowRight size={18} />}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Title order={1} size="h2" fw={700}>
                Fitness profile
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
                We'll tune your plan around these answers.
              </Text>

              <Stack mt={32} gap={40}>
                <Field label="Fitness goal">
                  <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
                    {goals.map((g) => {
                      const Icon = g.icon;
                      const active = goal === g.id;
                      return (
                        <UnstyledButton
                          key={g.id}
                          onClick={() => setGoal(g.id)}
                          className="glass"
                          style={{
                            position: "relative",
                            padding: rem(16),
                            borderRadius: rem(16),
                            transition: "all 0.2s ease",
                            transform: active ? "translateY(-4px)" : "none",
                            border: active
                              ? `2px solid var(--mantine-color-primary-filled)`
                              : "none",
                            boxShadow: active
                              ? "var(--mantine-shadow-glow)"
                              : "none",
                          }}
                        >
                          <Icon
                            size={24}
                            color={
                              active
                                ? `var(--mantine-color-primary-filled)`
                                : "var(--mantine-color-dimmed)"
                            }
                          />
                          <Text size="sm" fw={600} mt={8}>
                            {g.label}
                          </Text>
                          {active && (
                            <ThemeIcon
                              size={20}
                              radius="xl"
                              style={{ position: "absolute", top: 8, right: 8 }}
                            >
                              <Check size={12} />
                            </ThemeIcon>
                          )}
                        </UnstyledButton>
                      );
                    })}
                  </SimpleGrid>
                </Field>

                <Field label="Available equipment">
                  <Stack gap="lg">
                    {Object.entries(equipmentCategories).map(([cat, items]) => (
                      <Box key={cat}>
                        <Text
                          c="dimmed"
                          size="xs"
                          fw={700}
                          tt="uppercase"
                          mb="xs"
                        >
                          {cat}
                        </Text>
                        <Group gap={8}>
                          {items.map((item) => {
                            const active = equipment.includes(item);
                            return (
                              <Chip
                                key={item}
                                checked={active}
                                onChange={() => toggleEquipment(item)}
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

                <Field
                  label={`Gym frequency — ${frequency[0]} day${frequency[0] > 1 ? "s" : ""}/week`}
                >
                  <Box px="md">
                    <Slider
                      min={1}
                      max={6}
                      step={1}
                      value={frequency[0]}
                      onChange={(v) => setFrequency([v])}
                      label={null}
                      marks={[1, 2, 3, 4, 5, 6].map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                  </Box>
                </Field>

                <Field label="Workout duration per session">
                  <SegmentedControl
                    value={duration}
                    onChange={setDuration}
                    data={["30", "45", "60", "90"].map((v) => ({
                      label: `${v} min`,
                      value: v,
                    }))}
                    fullWidth
                    size="md"
                  />
                </Field>

                <Field label="Experience level">
                  <SegmentedControl
                    value={experience}
                    onChange={setExperience}
                    data={[
                      { label: "Beginner", value: "beginner" },
                      { label: "Intermediate", value: "intermediate" },
                      { label: "Advanced", value: "advanced" },
                    ]}
                    fullWidth
                    size="md"
                  />
                </Field>
              </Stack>

              <Group mt={40} gap="md">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  size="lg"
                  radius="xl"
                  px="xl"
                >
                  <ArrowLeft size={18} />
                </Button>
                <Button
                  onClick={() => navigate("/dashboard")}
                  size="lg"
                  radius="xl"
                  style={{ flex: 1 }}
                  className="shadow-glow"
                  leftSection={<Sparkles size={18} />}
                >
                  Generate My Plan
                </Button>
              </Group>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default Onboarding;

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
