import { useEffect, useState } from "react";
import { Alert, Button, Chip, Collapse, Divider, Group, Paper, SimpleGrid, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import { Bell, CircleAlert } from "lucide-react";
import { nativeNotifications, notificationScheduler, notificationStatus, requestExactAlarms, requestPermission } from "@/lib/notifications";
import { WEEKDAYS, validateNotificationPreferences } from "@/lib/notificationConfig";

export function NotificationPreferences({ user }) {
  const [prefs, setPrefs] = useState(() => notificationScheduler.read(user.id));
  const [status, setStatus] = useState({ permission: "checking", exact: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refresh = () => notificationStatus().then(setStatus).catch(() => setError("Could not read notification permissions. Please try again."));
  useEffect(() => {
    refresh();
    const changed = (event) => { refresh(); if (event.detail?.error) setError(event.detail.error); };
    window.addEventListener("focus", changed);
    window.addEventListener("fitbae-notification-status", changed);
    return () => {
      window.removeEventListener("focus", changed);
      window.removeEventListener("fitbae-notification-status", changed);
    };
  }, []);
  const set = (key, value) => { setPrefs((current) => ({ ...current, [key]: value })); setMessage(""); setError(""); };
  const run = async (work) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); await refresh(); }
    catch (failure) { setError(failure.message || "Could not update notifications. Please retry."); }
    finally { setBusy(false); }
  };
  const save = () => run(async () => {
    const validation = validateNotificationPreferences(prefs);
    if (validation) throw new Error(validation);
    await notificationScheduler.save(user.id, prefs);
    const current = await notificationStatus();
    setMessage(nativeNotifications && prefs.reminders && current.permission !== "granted"
      ? "Preferences saved on this device. Enable notifications to receive reminders."
      : "Notification preferences saved on this device.");
  });
  const granted = status.permission === "granted";
  return (
    <Paper className="surface" p={{ base: "lg", md: "xl" }}>
      <Stack gap="lg">
        <Group><Bell size={22} /><Title order={2} fz="xl">Notifications</Title></Group>
        <Text size="sm" c="dimmed">A useful nudge, on your terms. Preferences are private to this account on this device.</Text>
        {error && <Alert color="red" icon={<CircleAlert size={17} />} role="alert">{error}</Alert>}
        {message && <Alert color="green" role="status">{message}</Alert>}
        <Group justify="space-between">
          <Text size="sm" fw={700}>{granted ? "Notifications enabled" : status.permission === "unsupported" ? "System notifications aren't supported here" : status.permission === "checking" ? "Checking permissions…" : "System notifications are off"}</Text>
          <Button variant="light" loading={busy} disabled={granted || ["checking", "unsupported"].includes(status.permission)} onClick={() => run(async () => {
            const result = await requestPermission();
            if (result !== "granted") throw new Error(nativeNotifications ? "Allow notifications in Android Settings → Apps → FitBae → Notifications, then return here." : "Allow this site's notifications in your browser settings, then return here.");
            await notificationScheduler.refresh();
          })}>Enable notifications</Button>
        </Group>
        <Switch label="Rest timer alerts" description="Alert when a rest timer you started ends. The countdown always works." checked={prefs.restAlerts} disabled={busy} onChange={(event) => set("restAlerts", event.currentTarget.checked)} />
        {nativeNotifications ? <>
          <Text size="xs" c="dimmed">{status.exact ? "Precise alarms are allowed." : "Android may delay rest alerts unless you allow precise alarms."} Battery saving and Do Not Disturb can still delay or silence alerts. Change sounds in Android's FitBae notification settings.</Text>
          {!status.exact && <Button variant="subtle" size="xs" w="fit-content" disabled={busy || !granted} onClick={() => run(requestExactAlarms)}>Allow precise rest alerts</Button>}
          <Divider />
          <Switch label="Workout reminders" description="A weekly reminder on your chosen training days." checked={prefs.reminders} disabled={busy} onChange={(event) => set("reminders", event.currentTarget.checked)} />
          <Collapse expanded={prefs.reminders} transitionDuration={180}><Stack gap="md">
            <Group gap="xs" aria-label="Reminder days">{WEEKDAYS.map(([day, label]) => <Chip key={day} disabled={busy} checked={prefs.days.includes(day)} onChange={() => set("days", prefs.days.includes(day) ? prefs.days.filter((item) => item !== day) : [...prefs.days, day])}>{label}</Chip>)}</Group>
            <TextInput type="time" label="Reminder time" value={prefs.time} disabled={busy} onChange={(event) => set("time", event.currentTarget.value)} maw={220} />
            <Text size="xs" c="dimmed">Uses your phone's local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}), not your profile's display time zone. Open FitBae after travelling to refresh scheduled times. Reminders may arrive late when Android saves battery.</Text>
            <Switch label="Quiet hours for reminders" description="Rest timers you deliberately start are not muted by quiet hours." checked={prefs.quietHours} disabled={busy} onChange={(event) => set("quietHours", event.currentTarget.checked)} />
            {prefs.quietHours && <SimpleGrid cols={2} maw={450}>
              <TextInput type="time" label="Quiet hours start" value={prefs.quietStart} disabled={busy} onChange={(event) => set("quietStart", event.currentTarget.value)} />
              <TextInput type="time" label="Quiet hours end" value={prefs.quietEnd} disabled={busy} onChange={(event) => set("quietEnd", event.currentTarget.value)} />
            </SimpleGrid>}
          </Stack></Collapse>
        </> : <Text size="sm" c="dimmed">Scheduled workout reminders are available in the Android app. On the website, rest alerts are best effort while the workout page is open; browsers can suspend background timers and sound.</Text>}
        <Group>
          <Button loading={busy} onClick={save}>Save notification preferences</Button>
          {nativeNotifications && <Button variant="light" disabled={busy || !granted} onClick={() => run(async () => {
            await notificationScheduler.test(user.id);
            setMessage("Test alert scheduled for about 5 seconds from now. Android battery settings may delay it.");
          })}>Send test alert</Button>}
        </Group>
      </Stack>
    </Paper>
  );
}
