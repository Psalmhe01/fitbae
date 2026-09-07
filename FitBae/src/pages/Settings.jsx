import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Alert, Badge, Box, Button, Chip, Divider, Group, Modal, NumberInput,
  Paper, SegmentedControl, SimpleGrid, Stack, Text, TextInput, ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowLeft, Bell, BellOff, Check, CircleAlert, RefreshCw, Save,
  ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestPermission } from "@/lib/notifications";
import { generateWorkoutPlan } from "@/lib/gemini";
import { FITNESS_GOAL_OPTIONS, normalizeFitnessGoal } from "@/lib/fitnessConfig";
import { equipmentCategories } from "@/lib/equipmentLibrary";
import { equipmentLibrary } from "@/lib/equipmentLibrary";

const editableFields = [
  "name", "age", "weight", "height_cm", "sex", "fitness_goal",
  "equipment", "gym_frequency", "workout_duration", "experience_level",
];

function cleanProfile(profile) {
  return editableFields.reduce((result, key) => ({ ...result, [key]: profile[key] }), {});
}

export default function SettingsPage() {
  const { profile: shellProfile, session, setProfile: setShellProfile } = useOutletContext();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...cleanProfile(shellProfile),
    fitness_goal: normalizeFitnessGoal(shellProfile.fitness_goal) || "maintain",
    equipment: Array.isArray(shellProfile.equipment) ? shellProfile.equipment : [],
  }));
  const [saving, setSaving] = useState(false);
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [permission, setPermission] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const baseline = useMemo(() => JSON.stringify({
    ...cleanProfile(shellProfile),
    fitness_goal: normalizeFitnessGoal(shellProfile.fitness_goal) || "maintain",
  }), [shellProfile]);
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    const block = (event) => {
      if (!dirty || saving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", block);
    return () => window.removeEventListener("beforeunload", block);
  }, [dirty, saving]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleEquipment = (id) => set("equipment", form.equipment.includes(id)
    ? form.equipment.filter((item) => item !== id)
    : [...form.equipment, id]);

  const validate = () => {
    if (!form.name?.trim()) return "Name is required.";
    if (Number(form.age) < 18 || Number(form.age) > 100) return "Age must be between 18 and 100.";
    if (Number(form.weight) < 65 || Number(form.weight) > 700) return "Enter a realistic weight in pounds.";
    if (Number(form.height_cm) < 120 || Number(form.height_cm) > 230) return "Height must be between 120 and 230 cm.";
    if (!form.equipment.length) return "Select at least one available equipment item.";
    return "";
  };

  const saveOnly = async () => {
    const validation = validate();
    if (validation) {
      notifications.show({ title: "Check your preferences", message: validation, color: "red" });
      return false;
    }
    setSaving(true);
    const payload = { ...cleanProfile(form), name: form.name.trim() };
    const { error } = await supabase.from("profiles").update(payload).eq("user_id", session.user.id);
    setSaving(false);
    if (error) {
      notifications.show({ title: "Changes not saved", message: error.message, color: "red" });
      return false;
    }
    setShellProfile?.((current) => ({ ...current, ...payload }));
    notifications.show({ title: "Preferences saved", message: "Your current plan was left unchanged.", color: "green" });
    return true;
  };

  const saveAndRebuild = async () => {
    const validation = validate();
    if (validation) {
      notifications.show({ title: "Check your preferences", message: validation, color: "red" });
      return;
    }
    setSaving(true);
    let newPlanId = null;
    try {
      const payload = { ...cleanProfile(form), name: form.name.trim(), user_id: session.user.id };
      const plan = await generateWorkoutPlan(payload);
      const { data: insertedPlan, error: planError } = await supabase.from("workout_plans").insert({
        user_id: session.user.id,
        plan_json: plan,
        fitness_goal: payload.fitness_goal,
        experience_level: payload.experience_level,
      }).select("id").single();
      if (planError) throw planError;
      newPlanId = insertedPlan.id;
      const { error: profileError } = await supabase.from("profiles").update(cleanProfile(payload)).eq("user_id", session.user.id);
      if (profileError) throw profileError;
      setShellProfile?.((current) => ({ ...current, ...cleanProfile(payload) }));
      setRebuildOpen(false);
      notifications.show({ title: "Preferences and plan updated", message: "Your workout history stayed intact.", color: "green" });
      navigate("/plan");
    } catch (error) {
      if (newPlanId) await supabase.from("workout_plans").delete().eq("id", newPlanId).eq("user_id", session.user.id);
      notifications.show({ title: "Update not completed", message: error.message || "Your previous plan is still available.", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const enableNotifications = async () => {
    const result = await requestPermission();
    setPermission(result);
    if (result === "denied") notifications.show({ title: "Notifications are blocked", message: "Change this site's permission in your browser settings.", color: "orange" });
  };

  return (
    <Stack gap={32}>
      <Box><Button component={Link} to="/profile" variant="subtle" color="gray" px={0} leftSection={<ArrowLeft size={16} />}>Back to profile</Button><Text className="eyebrow" mt="xl">Make FitBae fit</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Preferences</Title><Text c="dimmed" mt="xs">Change your profile alone, or use the same changes to rebuild your plan.</Text></Box>

      {dirty && <Alert color="orange" icon={<CircleAlert size={17} />} title="Unsaved changes">Choose “Save profile” to leave this week's plan alone, or “Save & rebuild” to make a new one.</Alert>}

      <SettingsSection title="Personal details" description="Used for your profile and sensible input checks. Exact measurements are not sent to the plan generator.">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <TextInput label="Name" value={form.name || ""} onChange={(event) => set("name", event.currentTarget.value)} />
          <NumberInput label="Age" value={form.age} onChange={(value) => set("age", value)} min={18} max={100} />
          <NumberInput label="Weight (lb)" value={form.weight} onChange={(value) => set("weight", value)} min={65} max={700} />
          <NumberInput label="Height (cm)" value={form.height_cm} onChange={(value) => set("height_cm", value)} min={120} max={230} />
        </SimpleGrid>
      </SettingsSection>

      <SettingsSection title="Training setup" description="These settings drive the next plan you generate.">
        <Stack gap="xl">
          <Field label="Primary goal"><SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">{FITNESS_GOAL_OPTIONS.map((goal) => <Chip key={goal.value} checked={form.fitness_goal === goal.value} onChange={() => set("fitness_goal", goal.value)} icon={<Check size={13} />} styles={{ label: { width: "100%", padding: "12px 14px" } }}>{goal.label}</Chip>)}</SimpleGrid></Field>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            <Field label="Training days per week"><SegmentedControl fullWidth value={String(form.gym_frequency)} onChange={(value) => set("gym_frequency", Number(value))} data={["1", "2", "3", "4", "5", "6"]} /></Field>
            <Field label="Session duration"><SegmentedControl fullWidth value={String(form.workout_duration)} onChange={(value) => set("workout_duration", Number(value))} data={["30", "45", "60", "75", "90"].map((value) => ({ value, label: `${value}m` }))} /></Field>
          </SimpleGrid>
          <Field label="Experience"><SegmentedControl fullWidth value={form.experience_level} onChange={(value) => set("experience_level", value)} data={[{ value: "beginner", label: "New" }, { value: "intermediate", label: "Regular" }, { value: "advanced", label: "Experienced" }]} /></Field>
        </Stack>
      </SettingsSection>

      <SettingsSection title="Available equipment" description={`${form.equipment.length} of ${equipmentLibrary.length} items selected. Exercise swaps use this list too.`}>
        <Group mb="lg"><Button variant="light" size="xs" onClick={() => set("equipment", equipmentLibrary.map((item) => item.id))}>Select all</Button><Button variant="subtle" color="gray" size="xs" onClick={() => set("equipment", [])}>Clear</Button></Group>
        <Stack gap="lg">{Object.entries(equipmentCategories).map(([category, items]) => <Box key={category}><Text className="eyebrow" mb="xs">{category}</Text><Group gap={7}>{items.map((item) => <Chip key={item.id} checked={form.equipment.includes(item.id)} onChange={() => toggleEquipment(item.id)}>{item.name}</Chip>)}</Group></Box>)}</Stack>
      </SettingsSection>

      <SettingsSection title="Rest timer alerts" description="A sound and optional system notification can tell you when recovery time ends.">
        <Group justify="space-between" wrap="wrap"><Group><ThemeIcon variant="light" color={permission === "granted" ? "green" : "gray"} size={46}>{permission === "granted" ? <Bell size={20} /> : <BellOff size={20} />}</ThemeIcon><Box><Text fw={750}>{permission === "granted" ? "Notifications enabled" : permission === "unsupported" ? "Not supported by this browser" : "Browser notifications are off"}</Text><Text size="xs" c="dimmed">The in-app countdown works either way.</Text></Box></Group><Button variant="light" onClick={enableNotifications} disabled={permission === "granted" || permission === "unsupported"}>Enable</Button></Group>
      </SettingsSection>

      <Alert icon={<ShieldCheck size={18} />} color="brand" title="Your history stays separate">Rebuilding creates a new plan version. Completed sessions and the weights/reps you logged are never overwritten.</Alert>

      <Group justify="flex-end" style={{ position: "sticky", bottom: 16, zIndex: 80 }}>
        <Paper className="surface-raised" p="sm"><Group><Button variant="light" color="gray" onClick={saveOnly} loading={saving} disabled={!dirty} leftSection={<Save size={16} />}>Save profile</Button><Button onClick={() => setRebuildOpen(true)} disabled={!dirty} leftSection={<RefreshCw size={16} />}>Save & rebuild</Button></Group></Paper>
      </Group>

      <Modal opened={rebuildOpen} onClose={() => setRebuildOpen(false)} title="Build a new week from these changes?" closeOnClickOutside={!saving} withCloseButton={!saving}>
        <Stack><Alert color="orange" icon={<SlidersHorizontal size={17} />}>Your current plan remains in history, but the new plan becomes the one shown on Today and Plan.</Alert><Text size="sm" c="dimmed">Generation can take up to a minute. Keep this page open while the new week is checked and saved.</Text><Group justify="flex-end"><Button variant="subtle" color="gray" onClick={() => setRebuildOpen(false)} disabled={saving}>Cancel</Button><Button onClick={saveAndRebuild} loading={saving} leftSection={<RefreshCw size={16} />}>Save & rebuild</Button></Group></Stack>
      </Modal>
    </Stack>
  );
}

function SettingsSection({ title, description, children }) {
  return <Paper className="surface" p={{ base: "lg", md: "xl" }}><Group align="flex-start" mb="xl" wrap="nowrap"><ThemeIcon variant="light" color="brand"><SlidersHorizontal size={17} /></ThemeIcon><Box><Title order={2} fz="xl">{title}</Title><Text size="sm" c="dimmed" mt={4}>{description}</Text></Box></Group><Divider mb="xl" />{children}</Paper>;
}

function Field({ label, children }) {
  return <Stack gap={7}><Text size="sm" fw={700}>{label}</Text>{children}</Stack>;
}
