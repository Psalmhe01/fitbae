import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Container, Divider, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = ["signup", "forgot", "reset"].includes(params.get("mode")) ? params.get("mode") : "signin";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetReady, setResetReady] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (mode === "reset") setResetReady(Boolean(data.session));
      else if (data.session) navigate("/dashboard", { replace: true });
    }).catch(() => { if (active) setError("Sign-in could not be checked. Please try again."); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || mode === "reset") setResetReady(Boolean(session));
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [mode, navigate]);

  const changeMode = (next) => {
    if (busy) return;
    setError(""); setMessage(""); setPassword(""); setConfirmation("");
    setParams({ mode: next }, { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    setError(""); setMessage("");
    if (mode === "signup" && !name.trim()) return setError("Tell us what to call you.");
    if (["signup", "reset"].includes(mode) && password.length < 8) return setError("Use at least 8 characters for your password.");
    if (["signup", "reset"].includes(mode) && password !== confirmation) return setError("Your passwords don't match.");
    lock.current = true; setBusy(true);
    try {
      const address = email.trim().toLowerCase();
      if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/auth?mode=reset` });
        if (authError) throw authError;
        setMessage("If this email has an account, you'll receive a password-reset link. Check your inbox and spam folder.");
      } else if (mode === "reset") {
        if (!resetReady) throw new Error("Open the link from your reset email first, or request a new one.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setPassword(""); setConfirmation("");
        setMessage("Password updated. You can continue to your account.");
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: address, password,
          options: { data: { name: name.trim() }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (authError) throw authError;
        setPassword(""); setConfirmation("");
        if (data.session) navigate("/dashboard", { replace: true });
        else setMessage("Check your email to confirm your account, then sign in. If you already have an account, sign in or reset your password.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: address, password });
        if (authError) throw authError;
        navigate("/dashboard", { replace: true });
      }
    } catch (authError) {
      setError(authError.code === "invalid_credentials" ? "Email or password is incorrect." : authError.message || "We couldn't complete that. Please try again.");
    } finally { lock.current = false; setBusy(false); }
  };

  const google = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
      if (authError) throw authError;
    } catch (authError) { setError(authError.message || "Google sign-in is unavailable."); }
    finally { lock.current = false; setBusy(false); }
  };

  const titles = { signin: "Good to see you.", signup: "Make room for stronger.", forgot: "Let's get you back in.", reset: "A fresh password." };
  return (
    <Box className="bg-hero" mih="100svh" py="lg">
      <Container size="sm">
        <Group justify="space-between"><BrandMark /><ThemeToggle /></Group>
        <Button component={Link} to="/" variant="subtle" color="gray" px={0} mt="xl" leftSection={<ArrowLeft size={16} />}>Back to FitBae</Button>
        <Paper className="surface-raised" p={{ base: "xl", sm: 40 }} mt="lg">
          <Text className="eyebrow">{mode === "signup" ? "Your own plan. Your shared rhythm." : "Welcome to FitBae"}</Text>
          <Title order={1} fz={{ base: 34, sm: 42 }} lts={-1.5} mt="sm">{titles[mode]}</Title>
          <Text c="dimmed" mt="sm" mb="xl">{mode === "signup" ? "Create your account, then build a week that fits you." : mode === "forgot" ? "We'll send you a secure link to choose a new password." : mode === "reset" ? "Choose a password you don't use elsewhere." : "Your next session—and your teammate—are waiting."}</Text>
          <form onSubmit={submit}>
            <Stack>
              {mode === "signup" && <TextInput label="Name or nickname" value={name} onChange={(e) => setName(e.currentTarget.value)} autoComplete="given-name" maxLength={60} required disabled={busy} />}
              {mode !== "reset" && <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} autoComplete="email" required disabled={busy} leftSection={<Mail size={17} />} />}
              {mode !== "forgot" && <PasswordInput label={mode === "reset" ? "New password" : "Password"} value={password} onChange={(e) => setPassword(e.currentTarget.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} required disabled={busy} description={mode !== "signin" ? "At least 8 characters. A longer, unique passphrase is better." : undefined} />}
              {["signup", "reset"].includes(mode) && <PasswordInput label="Confirm password" value={confirmation} onChange={(e) => setConfirmation(e.currentTarget.value)} autoComplete="new-password" required disabled={busy} />}
              {error && <Alert color="red" role="alert">{error}</Alert>}
              {message && <Alert color="green" role="status">{message}{mode === "reset" && <Button component={Link} to="/dashboard" fullWidth mt="md">Continue to FitBae</Button>}</Alert>}
              <Button type="submit" size="lg" loading={busy} disabled={mode === "reset" && !resetReady} rightSection={<ArrowRight size={18} />}>{mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in with email"}</Button>
              {mode === "signin" && <Button variant="subtle" color="gray" onClick={() => changeMode("forgot")} disabled={busy}>Forgot password?</Button>}
            </Stack>
          </form>
          {["signin", "signup"].includes(mode) && <><Divider label="or" my="lg" /><Button fullWidth variant="default" size="lg" onClick={google} disabled={busy}>Continue with Google</Button></>}
          <Group justify="center" mt="lg"><Text size="sm" c="dimmed">{mode === "signup" ? "Already have an account?" : mode === "signin" ? "New here?" : "Remember your password?"}</Text><Button variant="subtle" size="compact-sm" disabled={busy} onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create an account" : "Sign in"}</Button></Group>
        </Paper>
      </Container>
    </Box>
  );
}
