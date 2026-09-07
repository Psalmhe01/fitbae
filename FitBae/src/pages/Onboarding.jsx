import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Container, Group, LoadingOverlay, NumberInput,
  Paper, Progress, SegmentedControl, SimpleGrid, Stack, Text, TextInput,
  ThemeIcon, Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Activity, ArrowLeft, ArrowRight, Check, Dumbbell, Flame, Gauge,
  Heart, Scale, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateWorkoutPlan } from "@/lib/gemini";
import { FITNESS_GOAL_OPTIONS } from "@/lib/fitnessConfig";
import { equipmentCategories } from "@/lib/equipmentLibrary";
import { equipmentLibrary } from "@/lib/equipmentLibrary";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/BrandMark";

const goalIcons = {
  muscle: Dumbbell,
  strength: Gauge,
  lose: Flame,
  endurance: Activity,
  flexibility: Heart,
  maintain: Scale,
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [weight, setWeight] = useState("");
  const [heightUnit, setHeightUnit] = useState("ft");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [sex, setSex] = useState("prefer_not_to_say");
  const [goal, setGoal] = useState("muscle");
  const [equipment, setEquipment] = useState(equipmentLibrary.map((item) => item.id));
  const [frequency, setFrequency] = useState("4");
  const [duration, setDuration] = useState("60");
  const [experience, setExperience] = useState("intermediate");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/", { replace: true });
      const suggestedName = data.user?.user_metadata?.full_name || data.user?.user_metadata?.name;
      if (suggestedName) setName(suggestedName);
    });
  }, [navigate]);

  const progress = step / 3 * 100;
  const selectedEquipmentNames = useMemo(() => equipmentLibrary.filter((item) => equipment.includes(item.id)), [equipment]);

  const nextFromBasics = () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Tell us what to call you.";
    if (!Number(age) || Number(age) < 18 || Number(age) > 100) nextErrors.age = "Enter an age from 18 to 100.";
    const weightLbs = weightUnit === "kg" ? Number(weight) * 2.20462 : Number(weight);
    if (!weightLbs || weightLbs < 65 || weightLbs > 700) nextErrors.weight = "Enter a realistic weight.";
    const cm = heightUnit === "ft" ? Number(heightFeet) * 30.48 + Number(heightInches || 0) * 2.54 : Number(heightCm);
    if (!cm || cm < 120 || cm > 230) nextErrors.height = "Enter a height from 120–230 cm (about 4'–7'7\").";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep(2);
  };

  const nextFromTraining = () => {
    setErrors({});
    setStep(3);
  };

  const toggleEquipment = (id) => {
    setEquipment((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const generatePlan = async () => {
    if (!equipment.length) {
      setErrors({ equipment: "Choose at least one item. Select bodyweight-friendly accessories if that's what you have." });
      return;
    }
    setLoading(true);
    setErrors({});
    let previousProfile = null;
    let profileSaved = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your sign-in expired. Please sign in again.");
      const { data: existingProfile, error: existingProfileError } = await supabase.from("profiles")
        .select("user_id,name,email,age,weight,weight_unit,height_cm,sex,fitness_goal,equipment,gym_frequency,workout_duration,experience_level")
        .eq("user_id", user.id).maybeSingle();
      if (existingProfileError) throw existingProfileError;
      previousProfile = existingProfile;
      const weightLbs = weightUnit === "kg" ? Number(weight) * 2.20462 : Number(weight);
      const normalizedHeight = heightUnit === "ft"
        ? Number(heightFeet) * 30.48 + Number(heightInches || 0) * 2.54
        : Number(heightCm);
      const profileData = {
        user_id: user.id,
        name: name.trim(),
        email: user.email,
        age: Number(age),
        weight: Math.round(weightLbs * 10) / 10,
        weight_unit: "lbs",
        height_cm: Math.round(normalizedHeight * 10) / 10,
        sex,
        fitness_goal: goal,
        equipment,
        gym_frequency: Number(frequency),
        workout_duration: Number(duration),
        experience_level: experience,
      };

      const planJson = await generateWorkoutPlan(profileData);
      const { error: profileError } = await supabase.from("profiles").upsert(profileData, { onConflict: "user_id" });
      if (profileError) throw profileError;
      profileSaved = true;
      const { error: planError } = await supabase.from("workout_plans").insert({
        user_id: user.id,
        plan_json: planJson,
        fitness_goal: goal,
        experience_level: experience,
      });
      if (planError) throw planError;
      notifications.show({ title: "Your first week is ready", message: "You can swap any exercise before you start.", color: "green" });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (profileSaved) {
        if (previousProfile) {
          await supabase.from("profiles").update(previousProfile).eq("user_id", previousProfile.user_id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.from("profiles").delete().eq("user_id", user.id);
        }
      }
      notifications.show({ title: "We couldn't finish your plan", message: error.message || "Please try again.", color: "red", autoClose: 7000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="bg-hero" mih="100svh" py="lg">
      <Container size="md">
        <Group justify="space-between" mb={{ base: 32, md: 48 }}><BrandMark /><ThemeToggle /></Group>
        <Box mb="lg"><Group justify="space-between" mb="xs"><Text className="eyebrow">Step {step} of 3</Text><Text size="xs" c="dimmed">{Math.round(progress)}%</Text></Group><Progress value={progress} color="brand" size="sm" /></Box>

        <Paper className="surface-raised" p={{ base: "lg", sm: 40 }} pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ blur: 2, backgroundOpacity: 0.72 }} loaderProps={{ color: "brand" }} />
          {step === 1 && (
            <Stack gap={28}>
              <Box><Text className="eyebrow">Start with your baseline</Text><Title order={1} fz={{ base: 34, sm: 44 }} lts={-1.5} mt={5}>A plan that fits you.</Title><Text c="dimmed" mt="sm">These details set sensible starting points. Exact measurements are not sent to the workout generator.</Text></Box>
              <TextInput label="First name or nickname" value={name} onChange={(event) => setName(event.currentTarget.value)} error={errors.name} autoComplete="given-name" />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput label="Age" value={age} onChange={setAge} min={18} max={100} error={errors.age} />
                <Box><Text size="sm" fw={600} mb={6}>Profile sex (optional)</Text><SegmentedControl fullWidth value={sex} onChange={setSex} data={[{ label: "Female", value: "female" }, { label: "Male", value: "male" }, { label: "Skip", value: "prefer_not_to_say" }]} /></Box>
              </SimpleGrid>
              <Box><Group justify="space-between" mb={6}><Text size="sm" fw={600}>Weight</Text><SegmentedControl size="xs" value={weightUnit} onChange={setWeightUnit} data={["lbs", "kg"]} /></Group><NumberInput aria-label={`Weight in ${weightUnit}`} value={weight} onChange={setWeight} min={1} rightSection={<Text size="xs" c="dimmed">{weightUnit}</Text>} error={errors.weight} /></Box>
              <Box><Group justify="space-between" mb={6}><Text size="sm" fw={600}>Height</Text><SegmentedControl size="xs" value={heightUnit} onChange={setHeightUnit} data={["ft", "cm"]} /></Group>{heightUnit === "ft" ? <SimpleGrid cols={2}><NumberInput label="Feet" value={heightFeet} onChange={setHeightFeet} min={3} max={7} error={errors.height} /><NumberInput label="Inches" value={heightInches} onChange={setHeightInches} min={0} max={11} /></SimpleGrid> : <NumberInput aria-label="Height in centimeters" value={heightCm} onChange={setHeightCm} min={120} max={230} rightSection={<Text size="xs" c="dimmed">cm</Text>} error={errors.height} />}</Box>
              <Button size="lg" onClick={nextFromBasics} rightSection={<ArrowRight size={18} />}>Choose training goals</Button>
            </Stack>
          )}

          {step === 2 && (
            <Stack gap={30}>
              <Box><Text className="eyebrow">Shape your week</Text><Title order={1} fz={{ base: 34, sm: 44 }} lts={-1.5} mt={5}>What are we building toward?</Title><Text c="dimmed" mt="sm">Pick the priority that matters most right now. You can change it later.</Text></Box>
              <Box><Text size="sm" fw={700} mb="sm">Primary goal</Text><SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">{FITNESS_GOAL_OPTIONS.map((option) => { const Icon = goalIcons[option.value] || Target; const active = goal === option.value; return <Chip key={option.value} checked={active} onChange={() => setGoal(option.value)} icon={<Check size={14} />} styles={{ label: { width: "100%", height: "100%", padding: 16 } }}><Stack align="flex-start" gap={8}><Icon size={20} /><Text size="sm" fw={700}>{option.label}</Text></Stack></Chip>; })}</SimpleGrid></Box>
              <Box><Text size="sm" fw={700} mb="sm">Days per week</Text><SegmentedControl fullWidth value={frequency} onChange={setFrequency} data={["1", "2", "3", "4", "5", "6"].map((value) => ({ value, label: value }))} /></Box>
              <Box><Text size="sm" fw={700} mb="sm">Time per session</Text><SegmentedControl fullWidth value={duration} onChange={setDuration} data={["30", "45", "60", "75", "90"].map((value) => ({ value, label: `${value}m` }))} /></Box>
              <Box><Text size="sm" fw={700} mb="sm">Training experience</Text><SegmentedControl fullWidth value={experience} onChange={setExperience} data={[{ value: "beginner", label: "New" }, { value: "intermediate", label: "Regular" }, { value: "advanced", label: "Experienced" }]} /></Box>
              <Group justify="space-between"><Button variant="subtle" color="gray" onClick={() => setStep(1)} leftSection={<ArrowLeft size={17} />}>Back</Button><Button size="lg" onClick={nextFromTraining} rightSection={<ArrowRight size={18} />}>Choose equipment</Button></Group>
            </Stack>
          )}

          {step === 3 && (
            <Stack gap={28}>
              <Box><Text className="eyebrow">Make it practical</Text><Title order={1} fz={{ base: 34, sm: 44 }} lts={-1.5} mt={5}>What can you use?</Title><Text c="dimmed" mt="sm">Your plan will be restricted to this selection. Busy gym later? Swap a single movement without rebuilding the week.</Text></Box>
              <Group><Button size="xs" variant="light" onClick={() => setEquipment(equipmentLibrary.map((item) => item.id))}>Select all</Button><Button size="xs" variant="subtle" color="gray" onClick={() => setEquipment([])}>Clear</Button><Badge variant="outline" color="gray">{selectedEquipmentNames.length} selected</Badge></Group>
              <Stack gap="lg">{Object.entries(equipmentCategories).map(([category, items]) => <Box key={category}><Text className="eyebrow" mb="xs">{category}</Text><Group gap={7}>{items.map((item) => <Chip key={item.id} checked={equipment.includes(item.id)} onChange={() => toggleEquipment(item.id)} size="sm">{item.name}</Chip>)}</Group></Box>)}</Stack>
              {errors.equipment && <Alert color="red">{errors.equipment}</Alert>}
              <Alert icon={<ShieldCheck size={18} />} color="brand" title="A careful first draft">Starting loads are suggestions. Stop for sharp pain, dizziness, or loss of control, and ask a qualified professional when you're unsure.</Alert>
              <Group justify="space-between"><Button variant="subtle" color="gray" onClick={() => setStep(2)} leftSection={<ArrowLeft size={17} />}>Back</Button><Button size="lg" color="brand" c="dark.9" onClick={generatePlan} leftSection={<Sparkles size={18} />}>Build my week</Button></Group>
            </Stack>
          )}
        </Paper>
        <Text ta="center" size="xs" c="dimmed" mt="lg">You stay in control. Every generated movement can be reviewed and replaced.</Text>
      </Container>
    </Box>
  );
}
