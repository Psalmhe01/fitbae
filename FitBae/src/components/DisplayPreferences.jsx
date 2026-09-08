import { useState } from "react";
import { Alert, Button, Group, Paper, Select, Stack, Text, Title } from "@mantine/core";
import { Clock3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeTimeZone } from "@/lib/dates";

const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["America/Chicago", "America/New_York", "America/Los_Angeles", "Europe/London", "Africa/Lagos", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];
const choices = [{ value: "device", label: "Automatic — use this device" }, { value: "UTC", label: "UTC" }, ...zones.map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") }))];

export function DisplayPreferences({ user, onUserChange }) {
  const saved = normalizeTimeZone(user?.user_metadata?.fitbae_timezone) || "device";
  const [zone, setZone] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const save = async () => {
    setBusy(true); setError(""); setSuccess(false);
    try {
      const { data, error: saveError } = await supabase.auth.updateUser({ data: { fitbae_timezone: zone } });
      if (saveError) throw saveError;
      onUserChange(data.user); setSuccess(true);
    } catch { setError("Your time zone couldn't be saved. Please retry."); }
    finally { setBusy(false); }
  };
  return <Paper className="surface" p={{ base: "lg", md: "xl" }}><Stack>
    <Group><Clock3 size={20} /><Title order={2} fz="xl">Your time zone</Title></Group>
    <Text size="sm" c="dimmed">Chat and activity timestamps use your chosen zone, including daylight-saving changes. Workout scheduling follows your device's local day.</Text>
    <Select label="Display time zone" searchable allowDeselect={false} data={choices} value={zone} onChange={(value) => { setZone(value || "device"); setSuccess(false); }} disabled={busy} nothingFoundMessage="No matching time zone" />
    <Text size="xs" c="dimmed">Device reports {Intl.DateTimeFormat().resolvedOptions().timeZone}. Preview: {new Intl.DateTimeFormat(undefined, { timeZone: normalizeTimeZone(zone), dateStyle: "medium", timeStyle: "short" }).format(new Date())}</Text>
    {error && <Alert color="red">{error}</Alert>}{success && <Text size="sm" c="green">Time zone saved.</Text>}
    <Group justify="flex-end"><Button variant="light" onClick={save} loading={busy} disabled={zone === saved}>Save time zone</Button></Group>
  </Stack></Paper>;
}
