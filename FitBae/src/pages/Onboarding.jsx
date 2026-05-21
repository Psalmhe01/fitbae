import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { // Removed `useTheme` as it's not directly used in Onboarding.jsx
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
  LoadingOverlay,
  Image,
  Avatar,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { ThemeToggle } from "@/components/theme-toggle"; // Keep ThemeToggle for UI
import { equipmentCategories } from "@/lib/mock-data";
import { equipmentLibrary, getEquipmentById } from "@/lib/equipmentLibrary";
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
import { supabase } from "@/lib/supabase"; // Import Supabase client
import { generateWorkoutPlan } from "@/lib/gemini";

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
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [errors, setErrors] = useState({});

  // Step 1 states
  const [name, setName] = useState("");
  const [age, setAge] = useState(null);
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weightValue, setWeightValue] = useState(null);
  const [heightUnit, setHeightUnit] = useState("ft");
  const [heightFtValue, setHeightFtValue] = useState(null);
  const [heightInValue, setHeightInValue] = useState(null);
  const [heightCmValue, setHeightCmValue] = useState(null);
  const [sex, setSex] = useState("male");
  // Step 2 states (already existing)
  const [goal, setGoal] = useState("muscle"); // Default to muscle
  const [equipment, setEquipment] = useState(equipmentLibrary.map(eq => eq.id)); // Default to all equipment IDs
  const [frequency, setFrequency] = useState([4]); // Default frequency
  const [duration, setDuration] = useState("60");
  const [experience, setExperience] = useState("intermediate");

  useEffect(() => {
    const prefillUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setName(user.user_metadata.full_name);
      } else if (user?.user_metadata?.name) {
        setName(user.user_metadata.name);
      }
    };
    prefillUser();
  }, []);

  const toggleEquipment = (e) =>
    setEquipment((prev) => // e is now the equipment ID
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e], // Store IDs
    );

  const handleContinue = () => {
    const newErrors = {};
    
    // Basic validation for Step 1
    if (!name.trim()) newErrors.name = "Name is required";
    if (age === null) newErrors.age = "Age is required";
    if (weightValue === null) newErrors.weight = "Weight is required";
    
    if (heightUnit === "ft") {
      if (heightFtValue === null) newErrors.heightFt = "Required";
      if (heightInValue === null) newErrors.heightIn = "Required";
    } else {
      if (heightCmValue === null) newErrors.heightCm = "Required";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setStep(2);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        notifications.show({
          title: "Authentication required",
          message: "You must be logged in to generate a plan.",
          color: "red",
        });
        navigate("/"); // Redirect to login/home if not logged in
        return;
      }

      // Standardize weight to lbs
      let weightLbs;
      if (weightUnit === "kg") {
        weightLbs = weightValue * 2.20462;
      } else {
        weightLbs = weightValue;
      }

      // Convert height to cm
      let heightCm;
      if (heightUnit === "ft") {
        heightCm = (heightFtValue * 30.48) + (heightInValue * 2.54);
      } else {
        heightCm = heightCmValue;
      }

      const profileData = {
        user_id: user.id,
        name,
        email: user.email,
        age,
        weight: weightLbs, // Store in lbs
        weight_unit: "lbs", // Standardize unit in DB
        height_cm: heightCm,
        sex,
        fitness_goal: goal,
        equipment,
        gym_frequency: frequency[0], // Slider returns an array
        workout_duration: parseInt(duration), // SegmentedControl returns string
        experience_level: experience,
      };

      // Save/Update profile data
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" }); // Use upsert to create or update

      if (profileError) {
        console.error("Error saving profile:", profileError);
        notifications.show({
          title: "Profile error",
          message: "Failed to save profile information. Please try again.",
          color: "red",
        });
        setLoading(false);
        return;
      }

      // --- Call Gemini API ---
      const planJson = await generateWorkoutPlan(profileData);

      // Save workout plan to database
      const { error: planError } = await supabase.from("workout_plans").insert({
        user_id: user.id,
        plan_json: planJson,
        fitness_goal: profileData.fitness_goal,
        experience_level: profileData.experience_level,
      });

      if (planError) {
        console.error("Error saving workout plan:", planError);
        notifications.show({
          title: "Storage error",
          message: "Plan generated, but we couldn't save it to your history.",
          color: "orange",
        });
        setLoading(false);
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      notifications.show({
        title: "Generation failed",
        message: "An unexpected error occurred while creating your plan.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

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
          pos="relative" // For LoadingOverlay
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
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  size="md"
                  radius="md"
                  error={errors.name}
                />
                <NumberInput
                  label="Age"
                  value={age}
                  onChange={setAge}
                  size="md"
                  radius="md"
                  error={errors.age}
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
                      value={weightValue}
                      onChange={setWeightValue}
                      size="md"
                      radius="md"
                      style={{ flex: 1 }}
                      min={1}
                      error={errors.weight}
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
                          value={heightFtValue}
                          placeholder="ft"
                          size="md"
                          radius="md"
                          onChange={setHeightFtValue}
                          min={1}
                          error={errors.heightFt}
                        />
                        <NumberInput
                          value={heightInValue}
                          placeholder="in"
                          size="md"
                          radius="md"
                          onChange={setHeightInValue}
                          min={0}
                          max={11}
                          error={errors.heightIn}
                        />
                      </>
                    ) : (
                      <NumberInput
                        value={heightCmValue}
                        placeholder="cm"
                        size="md"
                        radius="md"
                        onChange={setHeightCmValue}
                        min={1}
                        error={errors.heightCm}
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
                onClick={handleContinue}
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
                        <Group gap={8} style={{ flexWrap: 'wrap' }}>
                          {items.map((item) => { // item is now { id, name }
                            const active = equipment.includes(item.id);
                            const equip = getEquipmentById(item.id);
                            return (
                              <Chip
                                key={item.id}
                                checked={active}
                                onChange={() => toggleEquipment(item.id)} // Pass ID to toggle
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
                  onClick={handleGeneratePlan}
                  size="lg"
                  radius="xl"
                  style={{ flex: 1 }}
                  className="shadow-glow"
                  leftSection={<Sparkles size={18} />}
                  loading={loading}
                >
                  Generate My Plan
                </Button>
              </Group>
            </>
          )}
        </Paper>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
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
