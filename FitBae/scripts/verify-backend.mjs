import { createClient } from "@supabase/supabase-js";
import { adminEnvironment } from "./admin-env.mjs";

const env = await adminEnvironment();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const storageSmoke = process.argv.includes("--storage-smoke");
try {
  const schemaResponse = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" }, signal: AbortSignal.timeout(15_000) });
  const schema = await schemaResponse.json();
  if (!schemaResponse.ok) throw new Error("Schema inspection failed");
  console.log("REST server time:", schemaResponse.headers.get("date"));
  for (const name of ["partner_notes", "partner_reactions", "workout_sessions"]) {
    const column = schema.definitions?.[name]?.properties?.created_at || schema.definitions?.[name]?.properties?.started_at;
    console.log(`${name} timestamp schema:`, JSON.stringify(column ? { format: column.format, default: column.default } : "not exposed"));
  }
  for (const name of ["finalize_workout", "get_partner_avatar", "get_connected_partner", "find_partner_by_email", "get_partner_weekly_momentum"]) {
    const present = Boolean(schema.paths?.[`/rpc/${name}`]);
    console.log(`${name}: ${present ? "available" : "MISSING"}`);
    if (!present) process.exitCode = 1;
  }
  for (const name of ["equipment_id", "actual_value", "actual_unit"]) {
    const present = Boolean(schema.definitions?.exercise_logs?.properties?.[name]);
    console.log(`exercise_logs.${name}: ${present ? "available" : "MISSING"}`);
    if (!present) process.exitCode = 1;
  }
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(15_000) });
  const settings = await settingsResponse.json();
  console.log("Auth providers:", JSON.stringify({ email: settings.external?.email, google: settings.external?.google, signup_disabled: settings.disable_signup, email_confirmation: !settings.mailer_autoconfirm }));
  for (const [name, email, passwordKey] of [["AdminBoo", "adminboo@fitbae.test", "FITBAE_ADMINBOO_PASSWORD"], ["AdminBabe", "adminbabe@fitbae.test", "FITBAE_ADMINBABE_PASSWORD"]]) {
    const client = createClient(url, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await client.auth.signInWithPassword({ email, password: env[passwordKey] });
    if (login.error) { console.log(`${name}: login failed (${login.error.code || login.error.status}).`); process.exitCode = 1; continue; }
    try {
    const profile = await client.from("profiles").select("name").eq("user_id", login.data.user.id).single();
    const plan = await client.from("workout_plans").select("id").eq("user_id", login.data.user.id).limit(1);
    console.log(`${name}: email/password verified; profile ${profile.data?.name === name ? "ready" : "missing"}; plan ${plan.data?.length ? "ready" : "missing"}.`);
    if (profile.error || plan.error || !plan.data?.length) process.exitCode = 1;
    const visibleProfiles = await client.from("profiles").select("user_id");
    if (visibleProfiles.error || visibleProfiles.data?.length !== 1 || visibleProfiles.data[0]?.user_id !== login.data.user.id) throw new Error("Profile privacy check failed");
    console.log(`${name}: REST profile reads are owner-only.`);
    if (storageSmoke && name === "AdminBoo") {
      const path = `${login.data.user.id}/qa-probe-${crypto.randomUUID()}.png`;
      const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=", "base64");
      const bucket = client.storage.from("avatar-photos");
      let uploaded = false;
      try {
        const upload = await bucket.upload(path, bytes, { contentType: "image/png", upsert: false });
        if (upload.error) throw upload.error;
        uploaded = true;
        const download = await bucket.download(path);
        if (download.error || download.data?.size !== bytes.length) throw new Error("Owner photo read failed");
        const signed = await bucket.createSignedUrl(path, 30);
        if (signed.error || !signed.data?.signedUrl) throw new Error("Signed photo URL failed");
        const signedRead = await fetch(signed.data.signedUrl, { signal: AbortSignal.timeout(15_000) });
        if (!signedRead.ok || (await signedRead.arrayBuffer()).byteLength !== bytes.length) throw new Error("Signed photo read failed");
        const anonymous = createClient(url, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
        const forbidden = await anonymous.storage.from("avatar-photos").download(path);
        if (!forbidden.error) throw new Error("Private photo was anonymously readable");
        console.log("PASS: actual photo upload, owner download, signed URL and anonymous denial.");
      } finally {
        if (uploaded) {
          const cleanup = await bucket.remove([path]);
          if (cleanup.error) {
            process.exitCode = 1;
            console.error("Temporary QA photo cleanup failed. Check AdminBoo's qa-probe image in avatar-photos; saved profile pictures were not changed.");
          } else console.log("Temporary QA photo removed; saved profile pictures were not changed.");
        }
      }
    }
    } finally { await client.auth.signOut({ scope: "local" }); }
  }
} catch (error) {
  console.error(`Backend verification failed (${error.code || error.cause?.code || error.status || "CONNECTION_ERROR"}).`);
  process.exitCode = 1;
}
