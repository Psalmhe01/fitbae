import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };
const localConfig = join(root, ".env.android.local");
if (existsSync(localConfig)) {
  const local = parseEnv(readFileSync(localConfig, "utf8"));
  for (const key of ["JAVA_HOME", "ANDROID_HOME", "JAVA_TOOL_OPTIONS", "FITBAE_JAVA21_HOME"]) {
    if (!env[key] && local[key]) env[key] = local[key];
  }
}
// Some development environments set DEBUG globally, making the batch wrapper
// echo every command. Keep build logs readable without changing global settings.
env.DEBUG = "";
if (process.platform === "win32") {
  const studioJava = join(env.ProgramFiles || "C:\\Program Files", "Android", "Android Studio", "jbr");
  const androidSdk = env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Android", "Sdk");
  if (!env.JAVA_HOME && existsSync(studioJava)) env.JAVA_HOME = studioJava;
  if (!env.FITBAE_JAVA21_HOME) {
    const adoptium = join(env.ProgramFiles || "C:\\Program Files", "Eclipse Adoptium");
    const candidates = [
      ...(existsSync(adoptium) ? readdirSync(adoptium).filter((name) => name.startsWith("jdk-21")).sort().reverse().map((name) => join(adoptium, name)) : []),
      studioJava,
    ];
    env.FITBAE_JAVA21_HOME = candidates.find((candidate) => {
      const compiler = join(candidate, "bin", "javac.exe");
      if (!existsSync(compiler)) return false;
      const check = spawnSync(compiler, ["-version"], { encoding: "utf8", windowsHide: true });
      return check.status === 0 && /javac 21\./.test(`${check.stdout || ""}${check.stderr || ""}`);
    }) || "";
  }
  if (!env.ANDROID_HOME && androidSdk && existsSync(androidSdk)) env.ANDROID_HOME = androidSdk;
}
if (!env.ANDROID_HOME && env.ANDROID_SDK_ROOT) env.ANDROID_HOME = env.ANDROID_SDK_ROOT;
if (!env.ANDROID_HOME && !existsSync(join(root, "android", "local.properties"))) {
  console.error("Android SDK not found. Install it with Android Studio, then set ANDROID_HOME.");
  process.exit(1);
}
const result = spawnSync(process.platform === "win32" ? "gradlew.bat" : "sh",
  [...(process.platform === "win32" ? [] : ["./gradlew"]), "assembleDebug", "--console=plain", "--max-workers=2", "--no-daemon"], {
    cwd: join(root, "android"), env, stdio: "inherit", shell: process.platform === "win32",
  });
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status || 1);
console.log("\nInstallable test APK: android/app/build/outputs/apk/debug/app-debug.apk");
