import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { loadEnv } from "vite";
import { generationEndpoint } from "../src/lib/mobileConfig.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = loadEnv("mobile", root, "");
const endpoint = generationEndpoint(true, env.VITE_API_BASE_URL);
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error("Public Supabase configuration is required.");
const clientKey = env.VITE_SUPABASE_ANON_KEY;
if (clientKey.startsWith("sb_secret_")) throw new Error("A server-only Supabase key cannot be bundled in an APK.");
if (clientKey.split(".").length === 3) {
  const payload = JSON.parse(Buffer.from(clientKey.split(".")[1], "base64url").toString("utf8"));
  if (payload.role !== "anon") throw new Error("The bundled Supabase JWT must have the anon role.");
}
const testAccounts = join(root, ".env.test-accounts.local");
const privateConfig = { ...env, ...(existsSync(testAccounts) ? parseEnv(readFileSync(testAccounts, "utf8")) : {}) };
const secrets = Object.entries(privateConfig).filter(([key, value]) =>
  /PASSWORD|SERVICE_ROLE|GEMINI_API_KEY|SUPABASE_DB_URL|SECRET/i.test(key) && value?.length >= 8);

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const assets = files(join(root, "dist"));
for (const path of assets) {
  const content = readFileSync(path);
  for (const [key, value] of secrets) {
    if (content.includes(Buffer.from(value))) throw new Error(`Private configuration ${key} was found in bundled assets. APK build stopped.`);
  }
}
if (!assets.some((path) => path.endsWith(".js") && readFileSync(path, "utf8").includes(new URL(endpoint).origin))) {
  throw new Error("The mobile API origin was not bundled. Run the mobile build, not the website build.");
}
console.log(`Mobile bundle checked: ${assets.length} assets; no configured server/test secrets found.`);
