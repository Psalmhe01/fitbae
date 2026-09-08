import { readFile } from "node:fs/promises";
import pg from "pg";
import { verifyDatabaseBehavior } from "./verify-database-behavior.mjs";

const appRoot = new URL("../", import.meta.url);
const environment = { ...process.env };
try {
  for (const line of (await readFile(new URL(".env", appRoot), "utf8")).split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
    if (match && !environment[match[1]]) environment[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
} catch { /* A supplied DATABASE_URL needs no .env file. */ }

const mode = process.argv[2] || "--inspect";
if (!["--inspect", "--verify-behavior", "--apply-all", "--apply-core", "--apply-avatars", "--apply-training", "--apply-compatibility", "--apply-message-scope"].includes(mode)) throw new Error("Unknown database operation.");

let config;
try {
const connectionString = environment.SUPABASE_DB_URL || environment.DATABASE_URL;
if (connectionString) {
  const url = new URL(connectionString);
  const appHost = environment.VITE_SUPABASE_URL ? new URL(environment.VITE_SUPABASE_URL).hostname : "";
  const project = appHost.split(".")[0];
  const username = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${project}.supabase.co` && username === "postgres";
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) && username === `postgres.${project}`;
  if (!/^[a-z0-9]+\.supabase\.co$/.test(appHost) || !["postgres:", "postgresql:"].includes(url.protocol) || (!direct && !pooler) || !url.password) {
    throw new Error("The database URL must identify the same Supabase project as this app.");
  }
  config = { host: url.hostname, port: Number(url.port || 5432), database: url.pathname.slice(1) || "postgres", user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
} else {
  const appHost = new URL(environment.VITE_SUPABASE_URL).hostname;
  if (!/^[a-z0-9]+\.supabase\.co$/.test(appHost)) throw new Error("Expected this app's Supabase project URL.");
  const password = environment.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("Set SUPABASE_DB_URL in your local environment to connect.");
  config = { host: `db.${appHost}`, port: 5432, database: "postgres", user: "postgres", password };
}
} catch {
  // Invalid URL errors can include the password-bearing input. Never print them.
  console.error("Invalid database configuration. Use this project's Supabase connection string with an encoded password.");
  process.exit(1);
}

// Public CA from Supabase's official dashboard configuration:
// https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json
// Trust is scoped to this database client; TLS and hostname verification stay on.
const ca = await readFile(new URL("certs/supabase-prod-ca-2021.crt", import.meta.url), "utf8");
const client = new pg.Client({ ...config, ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 10_000, query_timeout: 30_000, application_name: "fitbae-migration" });
try {
  console.log(`Connecting through ${config.host.includes("pooler") ? "session pooler" : "direct database"} on port ${config.port}.`);
  await client.connect();
  console.log("Connected to the database for this FitBae project.");
  const clock = await client.query("select now() as server_time, current_setting('TimeZone') as database_timezone");
  console.log(JSON.stringify(clock.rows));
  const columns = await client.query(`select table_name, column_name, data_type, column_default from information_schema.columns
    where table_schema = 'public' and table_name in ('partner_notes', 'partner_reactions', 'partnerships', 'workout_sessions', 'exercise_logs')
    and (column_name like '%_at' or column_name in ('idempotency_key', 'actual_value', 'actual_unit')) order by table_name, column_name`);
  console.log(JSON.stringify(columns.rows, null, 2));
  const tables = await client.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  console.log("Public tables:", tables.rows.map((row) => row.tablename).join(", "));
  if (mode === "--inspect") {
    const schema = await client.query(`select table_name, jsonb_agg(column_name || ' ' || data_type order by ordinal_position) as columns
      from information_schema.columns where table_schema = 'public'
      and table_name in ('profiles', 'workout_plans', 'workout_sessions', 'exercise_logs', 'partnerships', 'partner_notes', 'partner_reactions') group by table_name order by table_name`);
    console.log("Schema:", JSON.stringify(schema.rows));
    const policies = await client.query("select schemaname, tablename, policyname, roles, cmd, qual, with_check from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname");
    console.log("Access policies:", JSON.stringify(policies.rows));
    const constraints = await client.query(`select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
      from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' order by c.relname, con.conname`);
    console.log("Constraints:", JSON.stringify(constraints.rows));
    const counts = await client.query(`select
      (select count(*) from public.profiles)::int as profiles,
      (select count(*) from public.workout_plans)::int as plans,
      (select count(*) from public.workout_sessions)::int as sessions,
      (select count(*) from public.exercise_logs)::int as logs,
      (select count(*) from public.partnerships)::int as partnerships,
      (select count(*) from public.partner_notes)::int as notes,
      (select count(*) from public.partner_reactions)::int as reactions`);
    console.log("Row counts (no record contents):", JSON.stringify(counts.rows[0]));
    const legacyEquipment = await client.query("select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'exercise_logs' and column_name = 'equipment') as present");
    if (legacyEquipment.rows[0].present) console.log("Legacy equipment labels:", JSON.stringify((await client.query("select equipment, count(*)::int as count from public.exercise_logs group by equipment")).rows));
  }
  if (mode === "--verify-behavior") {
    await verifyDatabaseBehavior(client);
  } else if (mode !== "--inspect") {
    const required = ["partnerships", "partner_notes", "partner_reactions", "workout_sessions", "exercise_logs"];
    if (!required.every((name) => tables.rows.some((table) => table.tablename === name))) throw new Error("The existing schema needs review before this migration can run.");
    const migrations = { "--apply-core": "202609060001_core_schema_and_rls.sql", "--apply-avatars": "202609080001_profile_avatars.sql", "--apply-training": "202609080002_training_and_chat.sql", "--apply-compatibility": "202609080003_legacy_access_compatibility.sql", "--apply-message-scope": "202609080004_partner_message_scope.sql" };
    const files = mode === "--apply-all" ? Object.values(migrations) : [migrations[mode]];
    const statements = await Promise.all(files.map(async (file) => (await readFile(new URL(`supabase/migrations/${file}`, appRoot), "utf8"))
      .replace(/^begin;\s*/i, "").replace(/commit;\s*$/i, "")));
    // One transaction for the full rollout: no partially upgraded schema if a
    // legacy dependency or permission check fails in a later migration.
    await client.query(`begin; set local lock_timeout = '5s';\n${statements.join("\n")}\nnotify pgrst, 'reload schema'; commit;`);
    for (const file of files) console.log(`Applied ${file}.`);
  }
  const accessRules = await client.query("select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'");
  console.log("Storage policies:", accessRules.rows.map((row) => row.policyname).join(", "));
} catch (error) {
  // Never print the connection object, URL, password, or a raw driver error.
  const reason = /timeout/i.test(error.message) ? "CONNECTION_TIMEOUT" : /certificate/i.test(error.message) ? "TLS_CERTIFICATE_ERROR" : error.code || "CONNECTION_OR_MIGRATION_ERROR";
  console.error(`Database operation failed (${reason}).`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
