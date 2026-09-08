import { readFile, access } from "node:fs/promises";
import pg from "pg";

const appRoot = new URL("../", import.meta.url);
const environment = { ...process.env };
try {
  for (const line of (await readFile(new URL(".env", appRoot), "utf8")).split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
    if (match && !environment[match[1]]) environment[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
} catch { /* A supplied DATABASE_URL needs no .env file. */ }

const mode = process.argv[2] || "--inspect";
if (!["--inspect", "--apply-avatars", "--apply-training"].includes(mode)) throw new Error("Unknown database operation.");

let config;
const connectionString = environment.SUPABASE_DB_URL || environment.DATABASE_URL;
if (connectionString) {
  const url = new URL(connectionString);
  const appHost = environment.VITE_SUPABASE_URL ? new URL(environment.VITE_SUPABASE_URL).hostname : "";
  const project = appHost.split(".")[0];
  if (!project || (!url.hostname.includes(project) && !decodeURIComponent(url.username).includes(project))) {
    throw new Error("The database URL must identify the same Supabase project as this app.");
  }
  config = { host: url.hostname, port: Number(url.port || 5432), database: url.pathname.slice(1) || "postgres", user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
} else {
  const appHost = new URL(environment.VITE_SUPABASE_URL).hostname;
  if (!/^[a-z0-9]+\.supabase\.co$/.test(appHost)) throw new Error("Expected this app's Supabase project URL.");
  let password = environment.SUPABASE_DB_PASSWORD;
  if (!password) {
    const passwordFile = new URL("../supabase password.txt", appRoot);
    await access(passwordFile);
    password = (await readFile(passwordFile, "utf8")).trim();
    if (!password || /\r|\n/.test(password)) throw new Error("Set SUPABASE_DB_PASSWORD in your local environment to connect.");
  }
  config = { host: `db.${appHost}`, port: 5432, database: "postgres", user: "postgres", password };
}

const client = new pg.Client({ ...config, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10_000, query_timeout: 30_000, application_name: "fitbae-migration" });
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
  if (mode !== "--inspect") {
    const required = ["partnerships", "partner_notes", "partner_reactions", "workout_sessions", "exercise_logs"];
    if (!required.every((name) => tables.rows.some((table) => table.tablename === name))) throw new Error("The existing schema needs review before this migration can run.");
    const file = mode === "--apply-avatars" ? "202609080001_profile_avatars.sql" : "202609080002_training_and_chat.sql";
    const migration = await readFile(new URL(`supabase/migrations/${file}`, appRoot), "utf8");
    await client.query(migration);
    console.log(`Applied ${file}.`);
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
