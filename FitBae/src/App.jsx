import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ActionIcon, Alert, Box, Button, Center, Container, Divider,
  Group, Indicator, Loader, Menu, Popover, ScrollArea, Stack, Text,
  UnstyledButton, rem,
} from "@mantine/core";
import {
  Bell, CalendarRange, ChevronDown, CircleAlert, Heart, History, LayoutDashboard,
  LogOut, MessageCircle, RefreshCw, Settings, User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/BrandMark";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";

const nav = [
  { to: "/dashboard", label: "Today", icon: LayoutDashboard },
  { to: "/plan", label: "Plan", icon: CalendarRange },
  { to: "/together", label: "Together", icon: Heart },
  { to: "/history", label: "Progress", icon: History },
];

const formatDateTime = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shellError, setShellError] = useState("");
  const [authRetry, setAuthRetry] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isWorkout = location.pathname === "/workout";

  const fetchNotifications = useCallback(async (userId) => {
    const [reactionsRes, notesRes] = await Promise.all([
      supabase.from("partner_reactions").select("id,message,created_at")
        .eq("recipient_id", userId).eq("seen", false).order("created_at", { ascending: false }),
      supabase.from("partner_notes").select("id,content,created_at")
        .eq("recipient_id", userId).eq("seen", false).order("created_at", { ascending: false }),
    ]);
    const reactions = (reactionsRes.data || []).map((item) => ({
      id: `reaction-${item.id}`, rowId: item.id, type: "reaction",
      content: item.message || "Your partner sent some encouragement", created_at: item.created_at,
    }));
    const notes = (notesRes.data || []).map((item) => ({
      id: `note-${item.id}`, rowId: item.id, type: "note",
      content: item.content, created_at: item.created_at,
    }));
    setNotifications([...reactions, ...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setShellError("");
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!currentSession) {
        setLoading(false);
        navigate("/", { replace: true });
        return;
      }
      setSession(currentSession);
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("*")
        .eq("user_id", currentSession.user.id).maybeSingle();
      if (!mounted) return;
      if (profileError) {
        setShellError("FitBae couldn't load your profile. Your data has not been changed.");
        setLoading(false);
        return;
      }
      if (!profileData) {
        setLoading(false);
        navigate("/onboarding", { replace: true });
        return;
      }
      setProfile(profileData);
      setLoading(false);
      fetchNotifications(currentSession.user.id);
    };
    load();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) navigate("/", { replace: true });
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [authRetry, fetchNotifications, navigate]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const channel = supabase.channel(`notifications-${session.user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "partner_reactions",
        filter: `recipient_id=eq.${session.user.id}`,
      }, () => fetchNotifications(session.user.id))
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "partner_notes",
        filter: `recipient_id=eq.${session.user.id}`,
      }, () => fetchNotifications(session.user.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, session?.user?.id]);

  const markAllRead = async () => {
    if (!session?.user?.id || notifications.length === 0) return;
    const [reactionResult, noteResult] = await Promise.all([
      supabase.from("partner_reactions").update({ seen: true }).eq("recipient_id", session.user.id).eq("seen", false),
      supabase.from("partner_notes").update({ seen: true }).eq("recipient_id", session.user.id).eq("seen", false),
    ]);
    if (!reactionResult.error && !noteResult.error) setNotifications([]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const isActive = (to) => location.pathname === to || (to === "/history" && location.pathname.startsWith("/history/"));

  if (loading) {
    return <Center mih="100svh" className="app-shell"><Loader color="brand" size="lg" /></Center>;
  }

  if (shellError) {
    return (
      <Center mih="100svh" className="app-shell" p="lg">
        <Alert icon={<CircleAlert size={18} />} color="red" title="We couldn't open FitBae" maw={520}>
          <Text size="sm" mb="md">{shellError}</Text>
          <Button color="red" variant="light" leftSection={<RefreshCw size={16} />} onClick={() => setAuthRetry((value) => value + 1)}>Try again</Button>
        </Alert>
      </Center>
    );
  }

  return (
    <Box className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {!isWorkout && (
        <Box
          component="aside"
          className="app-sidebar"
          visibleFrom="md"
          w={264}
          p="lg"
          style={{ position: "fixed", insetBlock: 0, insetInlineStart: 0, zIndex: 120 }}
        >
          <Stack h="100%" gap="xl">
            <UnstyledButton component={Link} to="/dashboard" aria-label="FitBae home">
              <BrandMark light />
            </UnstyledButton>
            <Stack component="nav" aria-label="Primary navigation" gap={6} mt="md">
              {nav.map(({ to, label, icon: Icon }) => (
                <UnstyledButton
                  component={Link}
                  to={to}
                  key={to}
                  className="nav-link"
                  data-active={isActive(to)}
                  aria-current={isActive(to) ? "page" : undefined}
                  px="md"
                  py={12}
                  style={{ borderRadius: rem(10) }}
                >
                  <Group gap="sm"><Icon size={18} /><Text fw={700} size="sm">{label}</Text></Group>
                </UnstyledButton>
              ))}
            </Stack>

            <Box mt="auto">
              <PaperLikePartnerCta navigate={navigate} />
              <Divider my="lg" color="rgba(255,255,255,.12)" />
              <UserMenu
                profile={profile}
                session={session}
                navigate={navigate}
                signOut={handleSignOut}
                inverted
              />
            </Box>
          </Stack>
        </Box>
      )}

      <Box ml={{ base: 0, md: isWorkout ? 0 : 264 }}>
        <Box
          component="header"
          className="app-header"
          h={72}
          style={{ position: "sticky", top: 0, zIndex: 110 }}
        >
          <Container size={isWorkout ? "sm" : "xl"} h="100%">
            <Group h="100%" justify="space-between">
              <Box hiddenFrom="md">{isWorkout ? <BrandMark compact /> : <BrandMark />}</Box>
              <Text className="eyebrow" visibleFrom="md">
                {isWorkout ? "Session in progress" : `Welcome back, ${profile?.name?.split(" ")[0] || "athlete"}`}
              </Text>
              <Group gap={4}>
                {!isWorkout && <NotificationMenu items={notifications} markAllRead={markAllRead} />}
                <ThemeToggle />
                {!isWorkout && (
                  <Box hiddenFrom="md">
                    <UserMenu profile={profile} session={session} navigate={navigate} signOut={handleSignOut} />
                  </Box>
                )}
              </Group>
            </Group>
          </Container>
        </Box>

        <Container
          id="main-content"
          component="main"
          size={isWorkout ? "sm" : "xl"}
          py={{ base: "lg", md: 36 }}
          pb={{ base: isWorkout ? 120 : 104, md: isWorkout ? 120 : 48 }}
        >
          <PageErrorBoundary><Outlet context={{ profile, session, setProfile, setSession }} /></PageErrorBoundary>
        </Container>
      </Box>

      {!isWorkout && (
        <Box component="nav" className="mobile-nav" hiddenFrom="md" pos="fixed" bottom={0} left={0} right={0} style={{ zIndex: 130 }} aria-label="Primary navigation">
          <Group grow gap={0} wrap="nowrap">
            {nav.map(({ to, label, icon: Icon }) => (
              <UnstyledButton
                component={Link}
                to={to}
                key={to}
                className="mobile-nav-link"
                data-active={isActive(to)}
                aria-current={isActive(to) ? "page" : undefined}
                py={11}
              >
                <Stack align="center" gap={3}><Icon size={20} /><Text size="xs" fw={700}>{label}</Text></Stack>
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}
    </Box>
  );
}

function PaperLikePartnerCta({ navigate }) {
  return (
    <UnstyledButton
      onClick={() => navigate("/together")}
      w="100%"
      p="md"
      style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, background: "rgba(255,255,255,.05)", color: "white" }}
    >
      <Group gap="sm" wrap="nowrap">
        <Heart size={18} color="var(--brand-coral)" fill="var(--brand-coral)" />
        <Box><Text size="sm" fw={800}>Your two-person team</Text><Text size="xs" c="gray.5">Open Together</Text></Box>
      </Group>
    </UnstyledButton>
  );
}

function UserMenu({ profile, session, navigate, signOut, inverted = false }) {
  return (
    <Menu shadow="md" width={210} position="top-end">
      <Menu.Target>
        <UnstyledButton aria-label="Open account menu" w={inverted ? "100%" : undefined}>
          <Group gap="sm" wrap="nowrap">
            <ProfileAvatar user={session?.user} name={profile?.name} size={38} />
            {inverted && <Box style={{ minWidth: 0 }}><Text c="white" size="sm" fw={700} truncate>{profile?.name}</Text><Text c="gray.5" size="xs">Account</Text></Box>}
            <ChevronDown size={15} color={inverted ? "#adb5bd" : "currentColor"} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<User size={16} />} onClick={() => navigate("/profile")}>Profile</Menu.Item>
        <Menu.Item leftSection={<Settings size={16} />} onClick={() => navigate("/settings")}>Preferences</Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<LogOut size={16} />} onClick={signOut}>Sign out</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function NotificationMenu({ items, markAllRead }) {
  return (
    <Popover width={320} position="bottom-end" shadow="lg">
      <Popover.Target>
        <Indicator label={items.length} size={17} disabled={!items.length} color="orange" withBorder offset={4}>
          <ActionIcon variant="subtle" color="gray" size={44} aria-label={`Notifications${items.length ? `, ${items.length} unread` : ""}`}>
            <Bell size={19} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" p="md" pb="sm">
          <Text fw={800}>Notifications</Text>
          {items.length > 0 && <Button variant="subtle" size="compact-sm" onClick={markAllRead}>Mark read</Button>}
        </Group>
        <Divider />
        <ScrollArea.Autosize mah={340}>
          {!items.length ? (
            <Stack align="center" py="xl" gap="xs"><Bell size={24} color="var(--ink-soft)" /><Text size="sm" c="dimmed">You're all caught up.</Text></Stack>
          ) : items.map((item) => (
            <Group key={item.id} align="flex-start" wrap="nowrap" p="md" style={{ borderBottom: "1px solid var(--line)" }}>
              <Box mt={2}>{item.type === "reaction" ? <Heart size={16} color="var(--brand-coral)" fill="var(--brand-coral)" /> : <MessageCircle size={16} />}</Box>
              <Box style={{ minWidth: 0 }}><Text size="sm" fw={600}>{item.content}</Text><Text size="xs" c="dimmed" mt={3}>{formatDateTime(item.created_at)}</Text></Box>
            </Group>
          ))}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
