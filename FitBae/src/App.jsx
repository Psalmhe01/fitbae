import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Group,
  Container,
  Text,
  ThemeIcon,
  Avatar,
  Menu,
  UnstyledButton,
  Stack,
  rem,
} from "@mantine/core";
import {
  LayoutDashboard,
  CalendarRange,
  History,
  User,
  LogOut,
  Settings,
  Dumbbell,
  ChevronDown,
} from "lucide-react";
import { mockUser } from "@/lib/mock-data";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/lib/theme";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "My Plan", icon: CalendarRange },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const accentFilled = "var(--mantine-color-primary-filled)";

  return (
    <Box className="bg-hero" style={{ minHeight: "100vh" }}>
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
                    <Avatar color="primary" radius="xl" size="sm">
                      {mockUser.initials}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="md">
                      {mockUser.name}
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
                    onClick={() => navigate("/profile")}
                  >
                    Settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<LogOut size={16} />}
                    onClick={() => navigate("/")}
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
                      boxShadow:  active ? "var(--shadow-glow)" : "none",
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
