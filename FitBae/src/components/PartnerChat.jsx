import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Group, Loader, Paper, ScrollArea, Stack, Text, Textarea, Title } from "@mantine/core";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatTimestamp, mergeMessages, userTimeZone } from "@/lib/dates";

export function PartnerChat({ user, partner }) {
  const userId = user.id;
  const partnerId = partner.user_id;
  const zone = userTimeZone(user);
  const key = `fitbae-chat-draft:${userId}:${partnerId}`;
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(key) || ""; } catch { return ""; } });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [older, setOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [visible, setVisible] = useState(false);
  const viewport = useRef(null);
  const panel = useRef(null);
  const nearBottom = useRef(true);
  const firstLoad = useRef(true);
  const sendLock = useRef(false);
  const pending = useRef(null);
  const alive = useRef(true);
  const query = useCallback(() => supabase.from("partner_notes").select("*")
    .or(`and(author_id.eq.${userId},recipient_id.eq.${partnerId}),and(author_id.eq.${partnerId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: false }).order("id", { ascending: false }), [userId, partnerId]);

  const refresh = useCallback(async () => {
    try {
      const { data, error: fetchError } = await query().range(0, 29);
      if (fetchError) throw fetchError;
      if (!alive.current) return;
      setMessages((current) => mergeMessages(current, data || []));
      if (firstLoad.current) setHasMore(data?.length === 30);
      firstLoad.current = false; setError("");
    } catch { if (alive.current) setError("Messages couldn't refresh. Your draft is still here."); }
    finally { if (alive.current) setLoading(false); }
  }, [query]);

  useEffect(() => {
    alive.current = true;
    refresh();
    const refreshVisible = () => { if (!document.hidden) refresh(); };
    const interval = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const inConversation = (item) => (item.author_id === userId && item.recipient_id === partnerId) || (item.author_id === partnerId && item.recipient_id === userId);
    const receive = ({ new: item }) => { if (inConversation(item)) setMessages((current) => mergeMessages(current, [item])); };
    const channel = supabase.channel(`chat-${userId}-${partnerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_notes", filter: `recipient_id=eq.${userId}` }, receive)
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_notes", filter: `author_id=eq.${userId}` }, receive)
      .subscribe();
    return () => { alive.current = false; clearInterval(interval); window.removeEventListener("online", refreshVisible); document.removeEventListener("visibilitychange", refreshVisible); supabase.removeChannel(channel); };
  }, [partnerId, refresh, userId]);

  useEffect(() => { try { text ? sessionStorage.setItem(key, text) : sessionStorage.removeItem(key); } catch { /* Sending still works if storage is unavailable. */ } }, [key, text]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (nearBottom.current && viewport.current && !older) viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages, older]);
  useEffect(() => {
    if (!visible || document.hidden) return;
    const unread = messages.filter((item) => item.recipient_id === userId && !item.seen).map((item) => item.id);
    if (!unread.length) return;
    let active = true;
    supabase.from("partner_notes").update({ seen: true }).eq("recipient_id", userId).eq("author_id", partnerId).in("id", unread)
      .then(({ error: readError }) => {
        if (!readError && active) {
          setMessages((current) => current.map((item) => unread.includes(item.id) ? { ...item, seen: true } : item));
          window.dispatchEvent(new Event("fitbae-notifications-read"));
        }
      }).catch(() => {});
    return () => { active = false; };
  }, [messages, partnerId, userId, visible]);

  const loadOlder = async () => {
    setOlder(true);
    const previousHeight = viewport.current?.scrollHeight || 0;
    try {
      const { data, error: fetchError } = await query().range(messages.length, messages.length + 29);
      if (fetchError) throw fetchError;
      nearBottom.current = false;
      setMessages((current) => mergeMessages(current, data || []));
      setHasMore(data?.length === 30);
      requestAnimationFrame(() => { if (viewport.current) viewport.current.scrollTop += viewport.current.scrollHeight - previousHeight; });
    } catch { setError("Older messages couldn't load. Try again."); }
    finally { setOlder(false); }
  };

  const send = async (event) => {
    event?.preventDefault();
    const content = text.trim();
    if (!content || sendLock.current || content.length > 500) return;
    sendLock.current = true; setSending(true); setSendError("");
    const draft = pending.current?.content === content ? pending.current : { id: crypto.randomUUID(), content };
    pending.current = draft;
    try {
      let { data, error: saveError } = await supabase.from("partner_notes").insert({
        ...draft, author_id: userId, recipient_id: partnerId, created_at: new Date().toISOString(),
      }).select().single();
      // A previous send can have committed even if its response was lost.
      if (saveError?.code === "23505") {
        const existing = await supabase.from("partner_notes").select("*").eq("id", draft.id).eq("author_id", userId).eq("recipient_id", partnerId).single();
        data = existing.data; saveError = existing.error;
      }
      if (saveError || !data) throw saveError || new Error("No message returned");
      nearBottom.current = true; setMessages((current) => mergeMessages(current, [data]));
      pending.current = null; setText("");
    } catch { setSendError("Message not sent. Your draft is safe—check your connection and retry."); }
    finally { sendLock.current = false; setSending(false); }
  };

  return <Paper ref={panel} className="surface-raised together-notes" p={{ base: "lg", sm: "xl" }} id="partner-chat">
    <Group justify="space-between"><Box><Text className="eyebrow">Just the two of you</Text><Title order={2} fz="xl" mt={4}>Your conversation</Title></Box><Button variant="subtle" size="xs" leftSection={<RefreshCw size={14} />} onClick={refresh}>Refresh</Button></Group>
    <Text size="xs" c="dimmed" mt="xs">Times shown in {zone || Intl.DateTimeFormat().resolvedOptions().timeZone}. Change this in Preferences.</Text>
    {error && <Alert color="orange" mt="md">{error}</Alert>}
    <ScrollArea h={360} viewportRef={viewport} my="lg" offsetScrollbars onScrollPositionChange={({ y }) => { if (viewport.current) nearBottom.current = viewport.current.scrollHeight - viewport.current.clientHeight - y < 60; }}>
      <Stack gap="sm" pr="xs" role="log" aria-label="Partner conversation" aria-live="polite">
        {hasMore && <Button variant="subtle" size="xs" onClick={loadOlder} loading={older}>Load older messages</Button>}
        {loading && <Loader size="sm" />}
        {messages.map((item) => {
          const mine = item.author_id === userId;
          return <Box key={item.id} p="md" bg={mine ? "var(--brand-soft)" : "var(--surface-muted)"} style={{ borderRadius: mine ? "14px 14px 3px 14px" : "14px 14px 14px 3px", alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "90%", overflowWrap: "anywhere" }}>
            <Text size="xs" fw={800}>{mine ? "You" : partner.name?.split(" ")[0] || "Partner"}</Text>
            <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>{item.content}</Text>
            <Text component="time" dateTime={item.created_at} size="xs" c="dimmed" mt={6} display="block">{formatTimestamp(item.created_at, { timeZoneName: "short" }, zone)}{mine ? item.seen ? " · Read" : " · Sent" : ""}</Text>
          </Box>;
        })}
        {!loading && !messages.length && <Stack align="center" py="xl"><MessageCircle size={25} /><Text size="sm" c="dimmed" ta="center">Your first message can be a little encouragement.</Text></Stack>}
      </Stack>
    </ScrollArea>
    <form onSubmit={send}><Stack gap="sm">
      <Textarea id="partner-message" label={`Message ${partner.name?.split(" ")[0] || "your partner"}`} placeholder="See you for the next set?" autosize minRows={2} maxRows={5} maxLength={500} value={text} onChange={(e) => setText(e.currentTarget.value)} disabled={sending} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); send(); } }} />
      {sendError && <Alert color="red" role="alert">{sendError}</Alert>}
      <Group justify="space-between"><Text size="xs" c="dimmed">{text.length}/500 · Ctrl/⌘ + Enter to send</Text><Button type="submit" loading={sending} disabled={!text.trim()} rightSection={<Send size={16} />}>Send message</Button></Group>
    </Stack></form>
  </Paper>;
}
