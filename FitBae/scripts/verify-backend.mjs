import { createClient } from "@supabase/supabase-js";
import { adminEnvironment } from "./admin-env.mjs";

const env = await adminEnvironment();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
try {
  const schemaResponse = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" }, signal: AbortSignal.timeout(15_000) });
  const schema = await schemaResponse.json();
  console.log("REST server time:", schemaResponse.headers.get("date"));
  for (const name of ["partner_notes", "partner_reactions", "workout_sessions"]) {
    const column = schema.definitions?.[name]?.properties?.created_at || schema.definitions?.[name]?.properties?.started_at;
    console.log(`${name} timestamp schema:`, JSON.stringify(column ? { format: column.format, default: column.default } : "not exposed"));
  }
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(15_000) });
  const settings = await settingsResponse.json();
  console.log("Auth providers:", JSON.stringify({ email: settings.external?.email, google: settings.external?.google, signup_disabled: settings.disable_signup, email_confirmation: !settings.mailer_autoconfirm }));
  for (const [name, email, passwordKey] of [["AdminBoo", "adminboo@fitbae.test", "FITBAE_ADMINBOO_PASSWORD"], ["AdminBabe", "adminbabe@fitbae.test", "FITBAE_ADMINBABE_PASSWORD"]]) {
    const client = createClient(url, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await client.auth.signInWithPassword({ email, password: env[passwordKey] });
    if (login.error) { console.log(`${name}: login failed (${login.error.code || login.error.status}).`); process.exitCode = 1; continue; }
    const profile = await client.from("profiles").select("name").eq("user_id", login.data.user.id).single();
    const plan = await client.from("workout_plans").select("id").eq("user_id", login.data.user.id).limit(1);
    console.log(`${name}: email/password verified; profile ${profile.data?.name === name ? "ready" : "missing"}; plan ${plan.data?.length ? "ready" : "missing"}.`);
    if (profile.error || plan.error || !plan.data?.length) process.exitCode = 1;
    await client.auth.signOut({ scope: "local" });
  }
} catch (error) {
  console.error(`Backend verification failed (${error.code || error.status || "CONNECTION_ERROR"}).`);
  process.exitCode = 1;
}
