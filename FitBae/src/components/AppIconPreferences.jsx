import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { palettes } from '@/theme/palettes';

const AppIcon = registerPlugin('AppIcon');
export function AppIconPreferences() {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AppIcon');
  useEffect(() => {
    if (!supported) return;
    let active = true;
    AppIcon.getIcon().then(({ icon }) => { if (active) setSelected(icon); }).catch(() => { if (active) setError('Could not read the current icon. Reopen the app to try again.'); });
    return () => { active = false; };
  }, [supported]);
  const choose = async (icon) => {
    setBusy(true); setError('');
    try { const result = await AppIcon.setIcon({ icon }); setSelected(result.icon); }
    catch { setError('The icon could not be changed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Paper className="surface" p="lg"><Stack>
    <Title order={2} size="h3">App icon</Title>
    <Text c="dimmed" size="sm">Choose a home-screen icon independently of your theme. Android may take a moment to refresh it, or close the app when it changes.</Text>
    {!supported && <Text size="sm">Icon switching requires the updated Android app. Website and browser-installed icons cannot be changed here.</Text>}
    {error && <Alert color="red">{error}</Alert>}
    <Group aria-label="App icon color">{Object.entries(palettes).map(([id, item]) => <Button key={id} disabled={!supported || busy} aria-pressed={selected === id} variant={selected === id ? 'filled' : 'default'} onClick={() => choose(id)} leftSection={<svg width="28" height="28" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="10" fill={item.accent} /><circle cx="12" cy="17" r="5" fill="none" stroke="#172006" strokeWidth="3" /><circle cx="22" cy="17" r="5" fill="none" stroke="#b83927" strokeWidth="3" /></svg>}>{item.label}</Button>)}</Group>
  </Stack></Paper>;
}
