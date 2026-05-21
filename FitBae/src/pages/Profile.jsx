import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Stack,
  Title,
  Text,
  Paper,
  SimpleGrid,
  Button,
  Box,
  Group,
  Avatar,
  ThemeIcon,
  rem,
  Loader,
  Center,
  Badge,
  TextInput,
  ActionIcon,
  Modal,
  Textarea,
  CopyButton,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { BarChart } from "@mantine/charts";
import {
  Settings,
  Award,
  Target,
  Activity,
  Calendar,
  FileText,
  Bell,
  BellOff,
  Heart,
  UserPlus,
  Check,
  X,
  Send,
  Copy,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestPermission } from "@/lib/notifications";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteId, setInviteId] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteOpened, { open: openNote, close: closeNote }] = useDisclosure(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [profileRes, historyRes, chartRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", session.user.id)
            .single(),
          supabase
            .from("workout_sessions")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("status", "completed")
            .order("finished_at", { ascending: false })
            .limit(3),
          supabase
            .from("workout_sessions")
            .select("finished_at, exercise_logs(weight_lbs, skipped)")
            .eq("user_id", session.user.id)
            .eq("status", "completed")
            .gte("finished_at", sevenDaysAgo.toISOString()),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (historyRes.data) setHistory(historyRes.data);

        // Fetch Partnership
        const { data: partnerData } = await supabase
          .from("partnerships")
          .select("*")
          .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
          .maybeSingle();

        if (partnerData) {
          setPartnership(partnerData);
          const partnerId = partnerData.requester_id === session.user.id 
            ? partnerData.recipient_id 
            : partnerData.requester_id;
          
          if (partnerData.status === 'accepted') {
            const { data: pProfile } = await supabase.from("profiles").select("*").eq("user_id", partnerId).maybeSingle();
            setPartnerProfile(pProfile);

            // Fetch shared notes
            const { data: notesData } = await supabase
              .from("partner_notes")
              .select("*")
              .or(`author_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
              .order("created_at", { ascending: false })
              .limit(10);
            if (notesData) setNotes(notesData);
          }
        }

        if (chartRes.data) {
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
            const dayName = date.toLocaleDateString("en-US", {
              weekday: "short",
            });

            const sessionsOnDay = chartRes.data.filter(
              (s) =>
                new Date(s.finished_at).toLocaleDateString("en-CA") ===
                dateString
            );

            const totalWeight = sessionsOnDay.reduce((daySum, session) => {
              const sessionVolume = (session.exercise_logs || []).reduce(
                (acc, log) => acc + (log.skipped ? 0 : (log.weight_lbs || 0)),
                0
              );
              return daySum + sessionVolume;
            }, 0);

            days.push({ day: dayName, volume: totalWeight });
          }
          setChartData(days);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Real-time listener for reactions and notes
  useEffect(() => {
    if (!profile?.user_id) return;

    const reactionChannel = supabase
      .channel('partner_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_reactions',
          filter: `recipient_id=eq.${profile.user_id}`,
        },
        (payload) => {
          notifications.show({
            title: 'Reaction Received!',
            message: payload.new.message || '❤️',
            icon: <Heart size={16} fill="var(--mantine-color-pink-filled)" color="pink" />,
            color: 'pink',
          });

          // Vibration for mobile users
          if ("vibrate" in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          
          const btn = document.getElementById('heart-btn');
          if (btn) {
            btn.classList.add('heart-beat');
            setTimeout(() => btn.classList.remove('heart-beat'), 800);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_notes',
          filter: `recipient_id=eq.${profile.user_id}`,
        },
        (payload) => {
          notifications.show({
            title: 'New Note!',
            message: payload.new.content,
            icon: <MessageCircle size={16} />,
            color: 'blue',
          });
          setNotes(prev => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reactionChannel);
    };
  }, [profile?.user_id]);

  const handleToggleNotifications = async () => {
    const result = await requestPermission();
    setNotifPermission(result);
  };

  const handleInvitePartner = async () => {
    const email = inviteId.trim();
    if (!email) {
      notifications.show({ title: "Error", message: "Please enter a valid email address.", color: "red" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (email.toLowerCase() === session.user.email.toLowerCase()) {
      notifications.show({ title: "Error", message: "You cannot invite yourself!", color: "red" });
      return;
    }

    // Find recipient_id by email
    const { data: recipientProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", email) // Case-insensitive lookup
      .maybeSingle();

    if (profileError) {
      console.error("Search error:", profileError);
      notifications.show({ 
        title: "Search Error", 
        message: "Could not search profiles. Check your RLS policies.", 
        color: "red" 
      });
      return;
    }

    if (!recipientProfile) {
      notifications.show({ 
        title: "Not Found", 
        message: "No user found with that email. Make sure they have finished onboarding.", 
        color: "red" 
      });
      return;
    }

    const { error } = await supabase.from("partnerships").insert({
      requester_id: session.user.id,
      recipient_id: recipientProfile.user_id,
      status: "pending"
    });
    if (!error) window.location.reload();
  };

  const handleUpdatePartnership = async (status) => {
    const { error } = await supabase
      .from("partnerships")
      .update({ status })
      .eq("id", partnership.id);
    if (!error) window.location.reload();
  };

  const handleSendReaction = async () => {
    if (!partnerProfile) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    // For visual feedback, we could use a toast/notification system here
    const { error } = await supabase.from("partner_reactions").insert({
      sender_id: session.user.id,
      recipient_id: partnerProfile.user_id,
      type: 'heart',
      message: "Thinking of you! 💪"
    });

    if (!error) {
      const btn = document.getElementById('heart-btn');
      if (btn) {
        btn.classList.add('heart-beat');
        notifications.show({ title: "Heart sent!", color: "pink", icon: <Heart size={14} fill="currentColor" /> });
        setTimeout(() => btn.classList.remove('heart-beat'), 800);
      }
    }
  };

  const handleSendNote = async () => {
    if (!noteContent.trim() || !partnerProfile) return;
    setSendingNote(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from("partner_notes").insert({
      author_id: session.user.id,
      recipient_id: partnerProfile.user_id,
      content: noteContent
    });

    setSendingNote(false);
    if (!error) {
      notifications.show({ title: "Note sent!", color: "green" });
      setNoteContent("");
      window.location.reload(); // Refresh to show new note
      closeNote();
    }
  };

  if (loading)
    return (
      <Center h="50vh">
        <Loader />
      </Center>
    );

  if (!profile) return <Text>No profile found.</Text>;

  const formatDuration = (s) => {
    const totalSeconds = Number(s) || 0;
    const mins = Math.floor(totalSeconds / 60);
    return mins > 0 ? `${mins}m` : `${s}s`;
  };

  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} size="h2" fw={700}>
          Profile
        </Title>
        <Text c="dimmed" mt={4}>
          Overview of your fitness journey.
        </Text>
      </Box>

      {/* Profile Overview Card */}
      <Paper
        className="glass shadow-glow"
        p={{ base: "xl", md: 32 }}
        radius="32px"
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xl">
            <Avatar size={rem(80)} radius="xl" color="primary" variant="light">
              {profile.name.charAt(0)}
            </Avatar>
            <Box>
              <Title order={2} size="h3">
                {profile.name}
              </Title>
              <Text c="dimmed">
                {profile.age} years old • {profile.weight} lbs
              </Text>
              <Group gap="xs" mt="xs">
                <Badge variant="dot" color="primary">
                  Active Member
                </Badge>
                <CopyButton value={profile.user_id} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied' : 'Copy My ID for Partner'} withArrow position="right">
                      <ActionIcon
                        variant="subtle"
                        color={copied ? 'teal' : 'gray'}
                        onClick={copy}
                        size="sm"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
          </Group>
          <Button
            component={Link}
            to="/settings"
            variant="light"
            radius="xl"
            leftSection={<Settings size={16} />}
          >
            Edit Profile
          </Button>
        </Group>
      </Paper>

      {/* Fitness Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <StatCard
          icon={Target}
          label="Goal"
          value={profile.fitness_goal}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="Experience"
          value={profile.experience_level}
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Frequency"
          value={`${profile.gym_frequency}x / week`}
          color="green"
        />
      </SimpleGrid>

      {/* Partnership Section */}
      <Paper className="glass shadow-glow" p="xl" radius="32px">
        <Title order={3} size="h4" mb="xs">Fitness Partner</Title>
        {!partnership ? (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">Connect with your partner to see their progress and send encouragement.</Text>
            <Group align="flex-end">
              <TextInput
                placeholder="Partner's Email"
                size="sm" 
                style={{ flex: 1 }}
                value={inviteId}
                onChange={(e) => setInviteId(e.currentTarget.value)}
              />
              <Button variant="light" radius="xl" leftSection={<UserPlus size={16} />} onClick={handleInvitePartner}>
                Invite
              </Button>
            </Group>
          </Stack>
        ) : partnership.status === 'pending' ? (
          <Group justify="space-between">
            <Box>
              <Text fw={600}>
                {partnership.requester_id === profile.user_id ? "Invitation Sent" : "Partner Invitation"}
              </Text>
              <Text size="xs" c="dimmed">
                {partnership.requester_id === profile.user_id 
                  ? "Waiting for them to accept..." 
                  : "Someone wants to be your fitness partner!"}
              </Text>
            </Box>
            {partnership.recipient_id === profile.user_id && (
              <Group gap="xs">
                <ActionIcon color="green" variant="light" radius="xl" size="lg" onClick={() => handleUpdatePartnership('accepted')}>
                  <Check size={18} />
                </ActionIcon>
                <ActionIcon color="red" variant="light" radius="xl" size="lg" onClick={() => handleUpdatePartnership('declined')}>
                  <X size={18} />
                </ActionIcon>
              </Group>
            )}
          </Group>
        ) : (
          <Group justify="space-between">
            <Group>
              <Avatar size="md" radius="xl" color="pink" variant="light">
                {partnerProfile?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Text fw={600}>{partnerProfile?.name || "Partner"}</Text>
                <Badge size="xs" variant="light" color="pink">Connected</Badge>
              </Box>
            </Group>
            <Group gap="xs">
              <ActionIcon 
                id="heart-btn"
                variant="filled" 
                color="pink" 
                radius="xl" 
                size="lg" 
                onClick={handleSendReaction}
                style={{ transition: 'transform 0.2s ease' }}
              >
                <Heart size={18} fill="white" />
              </ActionIcon>
              <Button 
                variant="subtle" 
                size="xs" 
                color="gray"
                onClick={openNote}
                leftSection={<Send size={14} />}
              >
                Send Note
              </Button>
            </Group>
          </Group>
        )}
      </Paper>

      {partnership?.status === 'accepted' && notes.length > 0 && (
        <Paper className="glass" p="xl" radius="32px">
          <Title order={3} size="h4" mb="md">Shared Notes</Title>
          <Stack gap="xs">
            {notes.map((note) => (
              <Box 
                key={note.id} 
                p="md" 
                className="glass-strong" 
                style={{ 
                  borderRadius: '16px',
                  alignSelf: note.author_id === profile.user_id ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  border: note.author_id === profile.user_id ? '1px solid var(--mantine-color-primary-outline)' : 'none'
                }}
              >
                <Text size="xs" fw={700} mb={4} c={note.author_id === profile.user_id ? "primary" : "pink"}>
                  {note.author_id === profile.user_id ? profile.name : (partnerProfile?.name || "Partner")}
                </Text>
                <Text size="sm">{note.content}</Text>
                <Text size="xs" c="dimmed" ta="right" mt={4}>
                  {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Note Modal */}
      <Modal opened={noteOpened} onClose={closeNote} title="Send a Note" centered radius="32px" classNames={{ content: 'glass-strong' }}>
        <Stack>
          <Textarea
            placeholder="Write something sweet or encouraging..."
            minRows={3}
            value={noteContent}
            onChange={(e) => setNoteContent(e.currentTarget.value)}
          />
          <Button 
            fullWidth 
            onClick={handleSendNote} 
            loading={sendingNote}
            disabled={!noteContent.trim()}
          >
            Send to {partnerProfile?.name || 'Partner'}
          </Button>
        </Stack>
      </Modal>

      {/* Notification Settings */}
      <Paper className="glass shadow-glow" p="xl" radius="24px">
        <Group justify="space-between">
          <Group gap="md">
            <ThemeIcon 
              variant="light" 
              color={notifPermission === "granted" ? "green" : "gray"} 
              size="lg" 
              radius="md"
            >
              {notifPermission === "granted" ? <Bell size={20} /> : <BellOff size={20} />}
            </ThemeIcon>
            <Box>
              <Text fw={600}>Rest Timer Notifications</Text>
              <Text size="xs" c="dimmed">
                Get alerted when your rest period finishes.
              </Text>
            </Box>
          </Group>
          <Button 
            variant="outline" 
            color={notifPermission === "granted" ? "green" : "primary"}
            radius="xl"
            onClick={handleToggleNotifications}
            disabled={notifPermission === "granted"}
          >
            {notifPermission === "granted" ? "Enabled" : "Enable"}
          </Button>
        </Group>
      </Paper>

      {/* Weekly Volume Chart */}
      <Paper className="glass shadow-glow" p="xl" radius="32px">
        <Title order={3} size="h4" mb="xl">
          Weekly Volume (lbs)
        </Title>
        <Box h={300}>
          <BarChart
            h={300}
            data={chartData}
            dataKey="day"
            series={[
              { name: "volume", color: "blue.6", label: "Weight Lifted" },
            ]}
            tickLine="y"
            gridAxis="xy"
            yAxisProps={{ width: 60 }}
          />
        </Box>
      </Paper>

      {/* Workout History Preview */}
      <Box>
        <Group justify="space-between" mb="md">
          <Title order={3} size="h4">
            Recent History
          </Title>
          <Button component={Link} to="/history" variant="subtle" size="xs">
            View All
          </Button>
        </Group>
        <Stack gap="sm">
          {history.length > 0 ? (
            history.map((p) => (
              <Paper key={p.id} className="glass" p="md" radius="xl">
                <Group justify="space-between">
                  <Group>
                    <ThemeIcon variant="light" size="md">
                      <FileText size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={600}>
                        {p.workout_type}: {p.focus}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(p.started_at).toLocaleDateString()} •{" "}
                        {formatDuration(p.duration_seconds || 0)}
                      </Text>
                    </Box>
                  </Group>
                  <Badge variant="outline" size="sm" color="green">
                    Done
                  </Badge>
                </Group>
              </Paper>
            ))
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              No workouts logged yet.
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Paper className="glass" p="lg" radius="24px">
      <Group gap="sm" mb={4}>
        <ThemeIcon variant="light" color={color} size="sm" radius="md">
          <Icon size={14} />
        </ThemeIcon>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text size="lg" fw={700} style={{ textTransform: "capitalize" }}>
        {value}
      </Text>
    </Paper>
  );
}
