import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Group,
  Container,
  Text,
  ThemeIcon,
  Avatar,
  Menu,
  Button,
  UnstyledButton,
  Stack,
  rem,
  Indicator,
  Popover,
  ScrollArea,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  LayoutDashboard,
  CalendarRange,
  History,
  User,
  LogOut,
  Settings,
  Dumbbell,
  ChevronDown,
  Bell,
  Heart as HeartIcon,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "My Plan", icon: CalendarRange },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

// Helper to format date in MM/DD hh:mm AM/PM CST
const formatCST = (dateString) => {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  }).format(new Date(dateString)).replace(',', '');
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unreadNotifs, setUnreadNotifs] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const accentFilled = "var(--mantine-color-primary-filled)";

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return navigate("/");
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!profileData && path !== "/onboarding") {
        navigate("/onboarding");
      } else {
        setProfile(profileData);
        fetchNotifications(session.user.id);
      }
    };

    getSession();
  }, [navigate, path]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_reactions',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = {
            id: payload.new.id,
            type: 'reaction',
            content: payload.new.message || 'Sent a heart!',
            created_at: payload.new.created_at
          };
          setUnreadNotifs(prev => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_notes',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = {
            id: payload.new.id,
            type: 'note',
            content: payload.new.content,
            created_at: payload.new.created_at
          };
          setUnreadNotifs(prev => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchNotifications = async (userId) => {
    const [reactionsRes, notesRes] = await Promise.all([
      supabase
        .from("partner_reactions")
        .select("*")
        .eq("recipient_id", userId)
        .eq("seen", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("partner_notes")
        .select("*")
        .eq("recipient_id", userId)
        .eq("seen", false)
        .order("created_at", { ascending: false })
    ]);

    const reactions = (reactionsRes.data || []).map(r => ({
      id: r.id,
      type: 'reaction',
      content: r.message || 'Sent a heart!',
      created_at: r.created_at
    }));

    const notes = (notesRes.data || []).map(n => ({
      id: n.id,
      type: 'note',
      content: n.content,
      created_at: n.created_at
    }));

    setUnreadNotifs([...reactions, ...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await Promise.all([
      supabase
        .from("partner_reactions")
        .update({ seen: true })
        .eq("recipient_id", user.id),
      supabase
        .from("partner_notes")
        .update({ seen: true })
        .eq("recipient_id", user.id)
    ]);
    setUnreadNotifs([]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Box className="bg-hero" style={{ minHeight: "100vh" }}>
      <Notifications position="top-right" zIndex={2000} />
      
      <Box
        component="header"
        className="glass-strong"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid var(--border)",
          height: rem(64),
        }}
      >
        <Container size="lg" h="100%">
          <Group justify="space-between" h="100%">
            <UnstyledButton component={Link} to="/dashboard">
              <Group gap="xs">
                <ThemeIcon variant="light" size="lg" radius="xl">
                  <Dumbbell size={20} />
                </ThemeIcon>
                <Text size="lg" fw={700} style={{ trackingTight: "-0.02em" }}>
                  FitBae
                </Text>
              </Group>
            </UnstyledButton>

            <Group gap="md">
              <ThemeToggle />
              
              <Popover width={300} position="bottom-end" shadow="md">
                <Popover.Target>
                  <Indicator label={unreadNotifs.length} size={16} disabled={unreadNotifs.length === 0} color="red" withBorder offset={4}>
                    <ActionIcon variant="subtle" color="gray" radius="xl" size="lg">
                      <Bell size={20} />
                    </ActionIcon>
                  </Indicator>
                </Popover.Target>
                <Popover.Dropdown className="glass-strong" p="xs">
                  <Group justify="space-between" mb="xs" px="xs" pt="xs">
                    <Text fw={700} size="sm">Notifications</Text>
                    {unreadNotifs.length > 0 && (
                      <Button variant="subtle" size="compact-xs" onClick={markAllRead}>Clear All</Button>
                    )}
                  </Group>
                  <Divider mb="xs" opacity={0.3} />
                  <ScrollArea.Autosize maxHeight={300}>
                    {unreadNotifs.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" py="xl">No new notifications</Text>
                    ) : (
                      <Stack gap={4}>
                        {unreadNotifs.map((n) => (
                          <UnstyledButton 
                            key={n.id} 
                            p="xs" 
                            className="glass" 
                            style={{ borderRadius: '8px' }}
                          >
                            <Group wrap="nowrap" gap="sm">
                              <ThemeIcon 
                                size="sm" 
                                variant="light" 
                                color={n.type === 'reaction' ? "pink" : "blue"} 
                                radius="xl"
                              >
                                {n.type === 'reaction' ? <HeartIcon size={12} fill="currentColor" /> : <MessageCircle size={12} />}
                              </ThemeIcon>
                              <Box style={{ flex: 1 }}>
                                <Text size="xs" fw={500}>{n.content}</Text>
                                <Text size="10px" c="dimmed">{formatCST(n.created_at)}</Text>
                              </Box>
                            </Group>
                          </UnstyledButton>
                        ))}
                      </Stack>
                    )}
                  </ScrollArea.Autosize>
                </Popover.Dropdown>
              </Popover>

              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <UnstyledButton
                    className="glass"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: rem(8),
                      borderRadius: rem(100),
                      padding: `${rem(4)} ${rem(12)} ${rem(4)} ${rem(4)}`,
                    }}
                  >
                    <Avatar
                      color="primary"
                      radius="xl"
                      size="sm"
                      src={user?.user_metadata?.avatar_url}
                    >
                      {profile?.name?.charAt(0) || user?.email?.charAt(0)}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="md">
                      {profile?.name || "User"}
                    </Text>
                    <ChevronDown
                      size={16}
                      color="var(--mantine-color-dimmed)"
                    />
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown className="glass-strong">
                  <Menu.Item
                    leftSection={<User size={16} />}
                    onClick={() => navigate("/profile")}
                  >
                    Profile
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<Settings size={16} />}
                    onClick={() => navigate("/settings")}
                  >
                    Settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<LogOut size={16} />}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py="xl">
        <Group align="flex-start" gap="xl">
          <Box
            component="aside"
            visibleFrom="md"
            style={{ width: rem(224), flexShrink: 0 }}
          >
            <Stack
              component="nav"
              className="glass"
              p="md"
              radius="xl"
              gap={4}
              style={{ position: "sticky", top: rem(96) }}
            >
              {nav.map((item) => {
                const Icon = item.icon;
                const active = path === item.to;
                return (
                  <UnstyledButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: rem(12),
                      padding: `${rem(10)} ${rem(12)}`,
                      borderRadius: rem(12),
                      fontSize: rem(14),
                      fontWeight: 500,
                      backgroundColor: active
                        ? "var(--mantine-color-primary-filled)"
                        : "transparent",
                      color: active
                        ? "var(--mantine-color-primary-light-color)"
                        : "var(--mantine-color-text)",
                      boxShadow: active ? "var(--shadow-glow)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon size={16} />
                    <Text size="sm" fw={500} inherit>
                      {item.label}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </Box>

          <Box
            component="main"
            style={{ flex: 1, minWidth: 0 }}
            pb={{ base: 80, md: 0 }}
          >
            <Outlet />
          </Box>
        </Group>
      </Container>

      <Box
        component="nav"
        hiddenFrom="md"
        className="glass-strong"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          borderTop: "1px solid var(--border)",
        }}
      >
        <Group grow gap={0}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <UnstyledButton
                key={item.to}
                component={Link}
                to={item.to}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: rem(4),
                  padding: `${rem(12)} 0`,
                  color: active ? accentFilled : "var(--mantine-color-dimmed)",
                  transition: "color 0.2s ease",
                }}
              >
                <Icon size={20} />
                <Text size="xs" fw={500} inherit>
                  {item.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </Box>
    </Box>
  );
}
