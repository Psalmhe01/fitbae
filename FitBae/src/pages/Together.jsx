import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ActionIcon, Alert, Avatar, Badge, Box, Button, Center, Divider, Group,
  Loader, Modal, Paper, Progress, SimpleGrid, Stack, Text, Textarea,
  TextInput, ThemeIcon, Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Check, Clock3, Heart, Link2, MessageCircle, Send, ShieldCheck,
  Sparkles, Unlink, UserPlus, X,
} from "lucide-react";
import { isMissingDatabaseFunction, supabase } from "@/lib/supabase";

const weekStart = () => {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const formatTime = (value) => value ? new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value)) : "";

export default function TogetherPage() {
  const { profile, session } = useOutletContext();
  const userId = session?.user?.id;
  const [relationship, setRelationship] = useState(null);
  const [partner, setPartner] = useState(null);
  const [notes, setNotes] = useState([]);
  const [ownSessions, setOwnSessions] = useState([]);
  const [partnerSessions, setPartnerSessions] = useState(null);
  const [partnerMomentum, setPartnerMomentum] = useState(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const partnerId = useMemo(() => {
    if (!relationship) return null;
    return relationship.requester_id === userId ? relationship.recipient_id : relationship.requester_id;
  }, [relationship, userId]);

  const fetchRelationship = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    const { data, error: relationshipError } = await supabase.from("partnerships")
      .select("*").or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false }).limit(1);
    if (relationshipError) setError("We couldn't load your partner connection.");
    setRelationship(data?.[0] || null);
    const { data: mine } = await supabase.from("workout_sessions")
      .select("id,day,workout_type,duration_seconds,finished_at")
      .eq("user_id", userId).eq("status", "completed").gte("finished_at", weekStart());
    setOwnSessions(mine || []);
    setLoading(false);
  }, [userId]);

  const fetchPartnerDetails = useCallback(async () => {
    if (!partnerId || relationship?.status !== "accepted") {
      setPartner(null);
      setNotes([]);
      setPartnerSessions(null);
      setPartnerMomentum(null);
      return;
    }
    const [profileRpc, momentumRpc, notesResult] = await Promise.all([
      supabase.rpc("get_connected_partner"),
      supabase.rpc("get_partner_weekly_momentum", { p_week_start: weekStart() }),
      supabase.from("partner_notes").select("*")
        .or(`and(author_id.eq.${userId},recipient_id.eq.${partnerId}),and(author_id.eq.${partnerId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: false }).limit(30),
    ]);

    let nextPartner = profileRpc.data?.[0] || null;
    if (profileRpc.error && isMissingDatabaseFunction(profileRpc.error, "get_connected_partner")) {
      const legacyProfile = await supabase.from("profiles")
        .select("user_id,name,gym_frequency,fitness_goal").eq("user_id", partnerId).maybeSingle();
      nextPartner = legacyProfile.data || null;
    } else if (profileRpc.error) {
      setError("We couldn't load your partner's shared profile.");
    }

    let nextPartnerSessions = [];
    let nextMomentum = momentumRpc.data?.[0] || null;
    if (momentumRpc.error && isMissingDatabaseFunction(momentumRpc.error, "get_partner_weekly_momentum")) {
      const legacySessions = await supabase.from("workout_sessions")
        .select("id,day,workout_type,duration_seconds,finished_at")
        .eq("user_id", partnerId).eq("status", "completed").gte("finished_at", weekStart());
      nextPartnerSessions = legacySessions.error ? null : (legacySessions.data || []);
      nextMomentum = null;
    } else if (momentumRpc.error) {
      nextPartnerSessions = null;
      nextMomentum = null;
    }

    setPartner(nextPartner || { user_id: partnerId, name: "Your partner" });
    setNotes(notesResult.data || []);
    setPartnerSessions(nextPartnerSessions);
    setPartnerMomentum(nextMomentum);
  }, [partnerId, relationship?.status, userId]);

  useEffect(() => { fetchRelationship(); }, [fetchRelationship]);
  useEffect(() => { fetchPartnerDetails(); }, [fetchPartnerDetails]);

  useEffect(() => {
    if (!userId || !partnerId || relationship?.status !== "accepted") return undefined;
    const channel = supabase.channel(`together-notes-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "partner_notes", filter: `recipient_id=eq.${userId}` }, (payload) => {
        if (payload.new.author_id === partnerId) setNotes((current) => [payload.new, ...current]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partnerId, relationship?.status, userId]);

  const invitePartner = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      notifications.show({ title: "Enter a valid email", message: "Use the email your partner uses for FitBae.", color: "red" });
      return;
    }
    if (normalizedEmail === session.user.email?.toLowerCase()) {
      notifications.show({ title: "That's your email", message: "Enter your partner's FitBae email instead.", color: "red" });
      return;
    }
    setWorking(true);
    const rpcLookup = await supabase.rpc("find_partner_by_email", { lookup_email: normalizedEmail });
    let recipient = rpcLookup.data?.[0] || null;
    let lookupError = rpcLookup.error;
    if (lookupError && isMissingDatabaseFunction(lookupError, "find_partner_by_email")) {
      const legacyLookup = await supabase.from("profiles")
        .select("user_id,name").ilike("email", normalizedEmail).maybeSingle();
      recipient = legacyLookup.data || null;
      lookupError = legacyLookup.error;
    }
    if (lookupError || !recipient) {
      notifications.show({ title: "We couldn't find that account", message: "They need to sign in and finish FitBae setup first.", color: "orange" });
      setWorking(false);
      return;
    }
    let result;
    if (relationship?.status === "declined") {
      result = await supabase.from("partnerships").update({
        requester_id: userId, recipient_id: recipient.user_id, status: "pending",
      }).eq("id", relationship.id);
    } else {
      result = await supabase.from("partnerships").insert({
        requester_id: userId, recipient_id: recipient.user_id, status: "pending",
      });
    }
    setWorking(false);
    if (result.error) notifications.show({ title: "Connection failed", message: result.error.message, color: "red" });
    else {
      setEmail("");
      notifications.show({ title: "Request ready", message: `${recipient.name || "Your partner"} will see it in FitBae.`, color: "green" });
      fetchRelationship();
    }
  };

  const updateRelationship = async (status) => {
    if (!relationship) return;
    setWorking(true);
    const { error: updateError } = await supabase.from("partnerships").update({ status }).eq("id", relationship.id);
    setWorking(false);
    if (updateError) notifications.show({ title: "Couldn't update request", message: updateError.message, color: "red" });
    else fetchRelationship();
  };

  const removeRelationship = async () => {
    if (!relationship) return;
    setWorking(true);
    const { error: removeError } = await supabase.from("partnerships").delete().eq("id", relationship.id);
    setWorking(false);
    if (removeError) notifications.show({ title: "Couldn't remove connection", message: removeError.message, color: "red" });
    else {
      setRelationship(null); setPartner(null); setNotes([]); setPartnerMomentum(null); setDisconnectOpen(false);
      notifications.show({ title: "Connection removed", message: "Your workout history was not changed.", color: "gray" });
    }
  };

  const sendHeart = async () => {
    if (!partnerId) return;
    const { error: sendError } = await supabase.from("partner_reactions").insert({
      sender_id: userId, recipient_id: partnerId, type: "heart",
      message: `${profile.name?.split(" ")[0] || "Your partner"} sent you a boost`,
    });
    if (sendError) notifications.show({ title: "Couldn't send that", message: sendError.message, color: "red" });
    else notifications.show({ title: `Boost sent to ${partner?.name?.split(" ")[0] || "your partner"}`, color: "orange" });
  };

  const sendNote = async () => {
    if (!note.trim() || !partnerId) return;
    setWorking(true);
    const { data, error: noteError } = await supabase.from("partner_notes").insert({
      author_id: userId, recipient_id: partnerId, content: note.trim(),
    }).select().single();
    setWorking(false);
    if (noteError) notifications.show({ title: "Message not sent", message: noteError.message, color: "red" });
    else {
      setNotes((current) => [data, ...current]); setNote(""); setNoteOpen(false);
      notifications.show({ title: "Note sent", color: "green" });
    }
  };

  if (loading) return <Center mih="55vh"><Loader color="brand" /></Center>;
  const status = relationship?.status;

  return (
    <Stack gap={32}>
      <Box><Text className="eyebrow">Your two-person team</Text><Title order={1} fz={{ base: 38, md: 50 }} lts={-2} mt={4}>Together</Title><Text c="dimmed" mt="xs">A private place for shared momentum—not comparison.</Text></Box>
      {error && <Alert color="red">{error}</Alert>}

      {status === "accepted" ? (
        <>
          <Paper className="today-card partner-accent" p={{ base: "xl", md: 32 }}>
            <Group justify="space-between" align="center" wrap="wrap" style={{ position: "relative", zIndex: 1 }}>
              <Group gap="lg">
                <Box style={{ position: "relative" }}>
                  <Avatar size={76} radius={24} color="orange">{partner?.name?.charAt(0) || "♥"}</Avatar>
                  <ThemeIcon color="brand" c="dark.9" size={28} radius="xl" style={{ position: "absolute", right: -8, bottom: -6 }}><Link2 size={14} /></ThemeIcon>
                </Box>
                <Box><Text className="eyebrow" c="gray.5">Connected</Text><Title order={2} fz={30} mt={3}>{profile.name?.split(" ")[0]} + {partner?.name?.split(" ")[0] || "partner"}</Title><Text size="sm" c="gray.4" mt={4}>Two plans. One team.</Text></Box>
              </Group>
              <Group><ActionIcon size={46} radius="xl" color="orange" onClick={sendHeart} aria-label={`Send encouragement to ${partner?.name || "your partner"}`}><Heart size={20} fill="currentColor" /></ActionIcon><Button color="brand" c="dark.9" leftSection={<MessageCircle size={17} />} onClick={() => setNoteOpen(true)}>Leave a note</Button></Group>
            </Group>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <WeekCard name="You" count={ownSessions.length} target={profile.gym_frequency || 1} sessions={ownSessions} />
            <WeekCard name={partner?.name?.split(" ")[0] || "Partner"} count={partnerMomentum?.session_count ?? partnerSessions?.length} target={partner?.gym_frequency || 1} sessions={partnerSessions} totalMinutes={partnerMomentum?.total_minutes} privateData={partnerMomentum === null && partnerSessions === null} partner />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 5 }} spacing="lg">
            <Paper className="surface-raised together-notes" p="xl">
              <Group justify="space-between"><Box><Text className="eyebrow">Shared notes</Text><Title order={2} fz="xl" mt={4}>A little encouragement</Title></Box><Button variant="light" leftSection={<Send size={16} />} onClick={() => setNoteOpen(true)}>Write</Button></Group>
              <Divider my="lg" />
              <Stack gap="sm">
                {notes.slice(0, 8).map((item) => {
                  const mine = item.author_id === userId;
                  return <Box key={item.id} p="md" bg={mine ? "var(--brand-soft)" : "var(--surface-muted)"} style={{ borderRadius: 12, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "88%" }}><Text size="xs" fw={800}>{mine ? "You" : partner?.name?.split(" ")[0]}</Text><Text size="sm" mt={4}>{item.content}</Text><Text size="xs" c="dimmed" mt={6}>{formatTime(item.created_at)}</Text></Box>;
                })}
                {!notes.length && <Stack align="center" py="xl"><MessageCircle size={25} color="var(--ink-soft)" /><Text size="sm" c="dimmed" ta="center">No notes yet. Start with the thing you'd want to hear before a hard set.</Text></Stack>}
              </Stack>
            </Paper>

            <Paper className="surface together-privacy" p="xl">
              <ThemeIcon variant="light" color="brand" size={48}><ShieldCheck size={22} /></ThemeIcon>
              <Title order={3} mt="lg">Privacy stays personal.</Title>
              <Text size="sm" c="dimmed" mt="sm" lh={1.55}>You share encouragement and high-level momentum. Your body measurements and detailed set history stay yours unless you choose otherwise.</Text>
              <Button color="red" variant="subtle" px={0} mt="xl" leftSection={<Unlink size={15} />} onClick={() => setDisconnectOpen(true)}>Disconnect</Button>
            </Paper>
          </SimpleGrid>
        </>
      ) : status === "pending" ? (
        <PendingCard relationship={relationship} userId={userId} working={working} accept={() => updateRelationship("accepted")} decline={() => updateRelationship("declined")} cancel={() => setDisconnectOpen(true)} />
      ) : (
        <ConnectCard email={email} setEmail={setEmail} invite={invitePartner} working={working} wasDeclined={status === "declined"} />
      )}

      <Modal opened={noteOpen} onClose={() => setNoteOpen(false)} title={`Note to ${partner?.name?.split(" ")[0] || "your partner"}`}>
        <Stack><Textarea label="Message" placeholder="You've got this. I'll see you after the last set." minRows={4} maxLength={500} value={note} onChange={(event) => setNote(event.currentTarget.value)} /><Group justify="space-between"><Text size="xs" c="dimmed">{note.length}/500</Text><Button onClick={sendNote} loading={working} disabled={!note.trim()} rightSection={<Send size={16} />}>Send note</Button></Group></Stack>
      </Modal>

      <Modal opened={disconnectOpen} onClose={() => setDisconnectOpen(false)} title={status === "accepted" ? "Disconnect from your partner?" : "Cancel this request?"}>
        <Stack><Text size="sm" c="dimmed">{status === "accepted" ? "This removes the FitBae connection. It won't delete either person's workout history." : "You can send a new request later."}</Text><Group justify="flex-end"><Button variant="subtle" color="gray" onClick={() => setDisconnectOpen(false)}>Keep it</Button><Button color="red" onClick={removeRelationship} loading={working}>{status === "accepted" ? "Disconnect" : "Cancel request"}</Button></Group></Stack>
      </Modal>
    </Stack>
  );
}

function ConnectCard({ email, setEmail, invite, working, wasDeclined }) {
  return (
    <Paper className="surface-raised" p={{ base: "xl", md: 48 }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
        <Box><ThemeIcon color="orange" variant="light" size={58} radius="md"><UserPlus size={27} /></ThemeIcon><Title order={2} fz={32} mt="xl">Bring your person along.</Title><Text c="dimmed" mt="sm" lh={1.6}>Connect an existing FitBae account to exchange encouragement and see each other's weekly rhythm. Detailed health information stays private.</Text>{wasDeclined && <Alert color="orange" mt="lg">The previous request was declined. You can send a new one whenever you're both ready.</Alert>}</Box>
        <Stack justify="center"><TextInput label="Partner's FitBae email" type="email" placeholder="partner@example.com" value={email} onChange={(event) => setEmail(event.currentTarget.value)} /><Button size="lg" onClick={invite} loading={working} rightSection={<Send size={17} />}>Send connection request</Button><Text size="xs" c="dimmed">They must finish setting up their FitBae profile first.</Text></Stack>
      </SimpleGrid>
    </Paper>
  );
}

function PendingCard({ relationship, userId, working, accept, decline, cancel }) {
  const incoming = relationship.recipient_id === userId;
  return (
    <Paper className="surface-raised" p={{ base: "xl", md: 48 }}>
      <ThemeIcon color="brand" variant="light" size={58}><Sparkles size={26} /></ThemeIcon>
      <Title order={2} mt="xl">{incoming ? "Someone wants to team up." : "Connection request sent."}</Title>
      <Text c="dimmed" mt="sm">{incoming ? "Accept to share encouragement and weekly workout momentum." : "Your partner will see the request the next time they open FitBae."}</Text>
      <Group mt="xl">{incoming ? <><Button onClick={accept} loading={working} leftSection={<Check size={17} />}>Accept</Button><Button variant="light" color="red" onClick={decline} disabled={working} leftSection={<X size={17} />}>Decline</Button></> : <Button variant="light" color="red" onClick={cancel}>Cancel request</Button>}</Group>
    </Paper>
  );
}

function WeekCard({ name, count, target, sessions, totalMinutes, privateData, partner }) {
  const safeCount = Number(count) || 0;
  const progress = Math.min(100, (safeCount / Math.max(1, Number(target) || 1)) * 100);
  return (
    <Paper className={`surface ${partner ? "partner-accent" : ""}`} p="xl">
      <Group justify="space-between"><Box><Text className="eyebrow">This week</Text><Title order={3} mt={4}>{name}</Title></Box><Text className="metric-number" fz={30} fw={850}>{privateData ? "—" : `${safeCount}/${target}`}</Text></Group>
      {privateData ? <Text c="dimmed" size="sm" mt="xl">Their workout totals are private right now. Encouragement still works.</Text> : <><Progress value={progress} color={partner ? "orange" : "brand"} mt="xl" mb="lg" /><Stack gap="xs">{(sessions || []).slice(0, 3).map((item) => <Group key={item.id} justify="space-between"><Text size="sm" fw={700}>{item.workout_type}</Text><Group gap={5}><Clock3 size={13} color="var(--ink-soft)" /><Text size="xs" c="dimmed">{Math.round((item.duration_seconds || 0) / 60)}m</Text></Group></Group>)}{safeCount > 0 && !(sessions || []).length && <Text size="sm" c="dimmed">{totalMinutes || 0} minutes across {safeCount} {safeCount === 1 ? "session" : "sessions"}.</Text>}{!safeCount && <Text size="sm" c="dimmed">No sessions logged yet this week.</Text>}</Stack></>}
    </Paper>
  );
}
