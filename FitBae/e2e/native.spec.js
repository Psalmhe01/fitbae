import { test, expect } from "./fixtures.js";

async function nativeShell(page, launchUrl) {
  await page.addInitScript(({ launchUrl }) => {
    window.androidBridge = {};
    window.nativeCalls = [];
    const listeners = new Map();
    let nextId = 0;
    window.emitNative = (name, payload) => {
      for (const listener of listeners.values()) if (listener.name === name) listener.callback(payload);
    };
    window.Capacitor = {
      PluginHeaders: [
        { name: "App", methods: [{ name: "addListener" }, ...["removeListener", "getLaunchUrl", "minimizeApp"].map((name) => ({ name, rtype: "promise" }))] },
        ...[["Browser", ["open", "close"]], ["SystemBars", ["setStyle"]], ["Filesystem", ["writeFile"]], ["Share", ["share"]]].map(([name, methods]) => ({ name, methods: methods.map((name) => ({ name, rtype: "promise" })) })),
      ],
      nativeCallback(_plugin, method, options, callback) {
        const id = String(++nextId);
        if (method === "addListener") listeners.set(id, { name: options.eventName, callback });
        return id;
      },
      async nativePromise(plugin, method, options) {
        window.nativeCalls.push({ plugin, method, options });
        if (method === "removeListener") listeners.delete(options.callbackId);
        if (method === "getLaunchUrl") return launchUrl ? { url: launchUrl } : {};
        if (method === "writeFile") return { uri: "file:///cache/exports/fitbae-workouts.csv" };
        return {};
      },
    };
    if (launchUrl) localStorage.setItem("sb-fitbae-e2e-auth-token-code-verifier", JSON.stringify("test-verifier"));
  }, { launchUrl });
}

test("native cold login exchanges once and doesn't replay when navigating", async ({ page, app }) => {
  await nativeShell(page, "com.fitbae.app://auth/callback?code=test-code");
  await page.goto("/");
  await expect(page).toHaveURL(/dashboard/);
  const launches = await page.evaluate(() => window.nativeCalls.filter((call) => call.method === "getLaunchUrl").length);
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/plan/);
  expect(app.authRequests).toHaveLength(1);
  expect(await page.evaluate(() => window.nativeCalls.filter((call) => call.method === "getLaunchUrl").length)).toBe(launches);
  await page.evaluate(() => window.emitNative("backButton", { canGoBack: false }));
  await expect.poll(() => page.evaluate(() => window.nativeCalls.some((call) => call.method === "minimizeApp"))).toBe(true);
});

test("native recovery opens password reset", async ({ page, app }) => {
  await nativeShell(page, "com.fitbae.app://auth/callback?mode=reset&code=recovery-code");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A fresh password." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeEnabled();
  expect(app.authRequests).toHaveLength(1);
});

test("native history export uses a private cached CSV and share sheet", async ({ page, app }) => {
  app.history = [{ id: "export", workout_type: "Full body", status: "completed", finished_at: "2026-09-08T18:30:00Z", duration_seconds: 600, exercise_logs: [] }];
  await nativeShell(page);
  await page.goto("/history");
  await page.getByRole("button", { name: "Export shown sessions", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativeCalls.some((call) => call.plugin === "Share" && call.method === "share"))).toBe(true);
  const write = await page.evaluate(() => window.nativeCalls.find((call) => call.method === "writeFile"));
  expect(write.options.directory).toBe("CACHE");
  expect(write.options.data).toContain("Full body");
  expect(write.options.path).toBe("exports/fitbae-workouts.csv");
});
