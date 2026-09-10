import { Link, useOutletContext } from 'react-router-dom';
import { Box, Button, Group, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/theme/theme';
import { palettes } from '@/theme/palettes';
import { AvatarEditor } from '@/components/AvatarEditor';
import { DisplayPreferences } from '@/components/DisplayPreferences';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { AppIconPreferences } from '@/components/AppIconPreferences';

export default function Preferences() {
  const { session, profile, setSession } = useOutletContext();
  const { palette, setPalette, colorScheme, setColorScheme } = useTheme();
  const updateUser = (user) => setSession((current) => ({ ...current, user }));
  return <Stack gap="xl">
    <Box><Button component={Link} to="/profile" variant="subtle" px={0}>Back to profile</Button><Text className="eyebrow">Make yourself at home</Text><Title order={1}>Preferences</Title><Text c="dimmed">Your look, your training, your pace.</Text></Box>
    <Paper className="surface" p="lg">
      <Stack>
        <Title order={2} size="h3">Appearance</Title>
        <Text size="sm" c="dimmed">Color and brightness are saved on this device. Change either without changing the other.</Text>
        <Group role="group" aria-label="Color theme">
          {Object.entries(palettes).map(([id, item]) => <Button key={id} variant={palette === id ? 'filled' : 'default'} aria-pressed={palette === id} onClick={() => setPalette(id)} leftSection={<span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: '50%', background: item.accent, border: '1px solid #555' }} />}>{item.label}</Button>)}
        </Group>
        <SegmentedControl aria-label="Theme brightness" value={colorScheme} onChange={setColorScheme} data={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Stack>
    </Paper>
    <AppIconPreferences />
    <Paper className="surface" p="lg"><Stack><Title order={2} size="h3">Workout settings</Title><Text c="dimmed">Goals, experience, schedule, equipment and body measurements. Your current plan stays unchanged until you choose to rebuild it.</Text><Button component={Link} to="/settings/workout" variant="light" rightSection={<ArrowRight size={16} />} style={{ alignSelf: 'flex-start' }}>Edit workout settings</Button></Stack></Paper>
    <AvatarEditor user={session.user} name={profile.name} onUserChange={updateUser} />
    <DisplayPreferences user={session.user} onUserChange={updateUser} />
    <NotificationPreferences key={session.user.id} user={session.user} />
  </Stack>;
}
