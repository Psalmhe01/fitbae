import { readFile } from "node:fs/promises";

export async function adminEnvironment() {
  const env = { ...process.env };
  let local = "";
  try { local = await readFile(new URL("../.env.test-accounts.local", import.meta.url), "utf8"); } catch { /* Optional test-only passwords. */ }
  for (const line of ((await readFile(new URL("../.env", import.meta.url), "utf8")) + "\n" + local).split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)\s*=\s*(.*?)\s*$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}
