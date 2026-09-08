import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Anchor, Badge, Box, Button, Container, Group, Paper, SimpleGrid,
  Stack, Text, ThemeIcon, Title, rem,
} from "@mantine/core";
import { ArrowRight, CalendarCheck, HeartHandshake, Repeat2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/BrandMark";

const features = [
  {
    icon: CalendarCheck,
    title: "Plans that line up",
    text: "Keep your own pace while sharing the days, finishers, and small wins that matter.",
  },
  {
    icon: Repeat2,
    title: "Swap without starting over",
    text: "Replace one movement instantly when a machine is busy or an exercise just isn't for you.",
  },
  {
    icon: HeartHandshake,
    title: "Encouragement, built in",
    text: "Share progress, leave a note, and make showing up feel like something you do together.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
  }, []);

  const openAccount = (mode = "signin") => navigate(session ? "/dashboard" : `/auth?mode=${mode}`);

  return (
    <Box className="bg-hero">
      <Box component="header" py="lg">
        <Container size="xl">
          <Group justify="space-between">
            <BrandMark />
            <Group gap="xs">
              <ThemeToggle />
              <Button
                variant="subtle"
                color="gray"
                onClick={() => openAccount()}
                loading={checkingSession}
                visibleFrom="sm"
              >
                {session ? "Open app" : "Sign in"}
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="xl" py={{ base: 28, md: 72 }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 40, md: 64 }} verticalSpacing={40}>
          <Stack justify="center" gap={0} maw={650}>
            <Badge variant="outline" color="gray" radius="sm" size="lg" w="fit-content" mb="xl">
              Training is better together
            </Badge>
            <Title order={1} fz={{ base: rem(56), sm: rem(72), lg: rem(88) }} lh={0.92} lts={rem(-4)} maw={620}>
              Your plan. Their pace. One team.
            </Title>
            <Text c="dimmed" fz={{ base: "lg", md: rem(21) }} lh={1.55} mt="xl" maw={560}>
              FitBae builds flexible training weeks for couples—personal enough to work, shared enough to keep you close.
            </Text>
            <Group mt={32} gap="sm">
              <Button
                size="xl"
                color="brand"
                c="dark.9"
                rightSection={<ArrowRight size={20} />}
                onClick={() => openAccount("signup")}
                loading={checkingSession}
              >
                {session ? "Continue training" : "Build our plan"}
              </Button>
              <Anchor href="#how-it-works" c="dimmed" fw={700} px="sm">See how it works</Anchor>
            </Group>
            <Text size="xs" c="dimmed" mt="md">Use your email or Google. No credit card required.</Text>
          </Stack>

          <Paper className="hero-photo" radius={{ base: 0, md: "xl" }}>
            <img
              src="/images/couple-training-hero.png"
              alt="A couple supporting each other through a dumbbell workout"
              width="1536"
              height="1024"
              fetchPriority="high"
            />
            <Stack className="hero-note" gap={6}>
              <Text className="eyebrow" c="brand.3">Tuesday · Upper body</Text>
              <Group justify="space-between" align="flex-end">
                <Box>
                  <Text fw={800} fz="xl">Show up for the set.</Text>
                  <Text c="gray.3" size="sm">Stay for each other.</Text>
                </Box>
                <ThemeIcon color="brand" c="dark.9" size={48} radius="xl">
                  <HeartHandshake size={23} />
                </ThemeIcon>
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Container>

      <Box id="how-it-works" py={{ base: 64, md: 96 }}>
        <Container size="xl">
          <Group justify="space-between" align="flex-end" mb={36}>
            <Box>
              <Text className="eyebrow">Built around real gym days</Text>
              <Title order={2} fz={{ base: 36, md: 50 }} lts={-2} mt="xs">Less planning. More showing up.</Title>
            </Box>
            <Text c="dimmed" maw={410} visibleFrom="md">
              Smart suggestions stay quietly in the background. You stay in control of every exercise and every session.
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {features.map(({ icon: Icon, title, text }, index) => (
              <Paper key={title} className="surface" p="xl" mih={220}>
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon variant="light" color={index === 2 ? "orange" : "brand"} size={48} radius="md">
                    <Icon size={23} />
                  </ThemeIcon>
                  <Text className="eyebrow">0{index + 1}</Text>
                </Group>
                <Title order={3} fz="xl" mt={32}>{title}</Title>
                <Text c="dimmed" mt="sm" lh={1.55}>{text}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      <Box component="footer" py="xl" style={{ borderTop: "1px solid var(--line)" }}>
        <Container size="xl">
          <Group justify="space-between">
            <BrandMark />
            <Text size="sm" c="dimmed">Move well. Stay close.</Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
