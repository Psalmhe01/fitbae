import { test, expect, USER_ID } from "./fixtures.js";

async function nativeShell(page, launchUrl) {
  await page.addInitScript(({ launchUrl }) => {
    window.androidBridge = {};
    window.nativeCalls = [];
    window.nativeNotificationPermission = "prompt";
    window.nativePendingNotifications = [];
    const listeners = new Map();
    let nextId = 0;
    window.emitNative = (name, payload) => {
      for (const listener of listeners.values()) if (listener.name === name) listener.callback(payload);
    };
    window.Capacitor = {
      PluginHeaders: [
        { name: "App", methods: [{ name: "addListener" }, ...["removeListener", "getLaunchUrl", "minimizeApp"].map((name) => ({ name, rtype: "promise" }))] },
        { name: "LocalNotifications", methods: [{ name: "addListener" }, ...["removeListener", "checkPermissions", "requestPermissions", "checkExactNotificationSetting", "changeExactNotificationSetting", "createChannel", "getDeliveredNotifications", "removeDeliveredNotifications", "schedule", "cancel"].map((name) => ({ name, rtype: "promise" }))] },
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
        if (plugin === "LocalNotifications") {
          if (method === "checkPermissions") return { display: window.nativeNotificationPermission };
          if (method === "requestPermissions") { window.nativeNotificationPermission = "granted"; return { display: "granted" }; }
          if (method === "checkExactNotificationSetting") return { exact_alarm: "denied" };
          if (method === "getDeliveredNotifications") return { notifications: [] };
          if (method === "cancel") window.nativePendingNotifications = window.nativePendingNotifications.filter((item) => !options.notifications.some(({ id }) => id === item.id));
          if (method === "schedule") window.nativePendingNotifications.push(...options.notifications);
        }
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

test("native reminders are opt-in, validate quiet hours and schedule in phone local time", async ({ page, app }) => {
  expect(app.user.id).toBe(USER_ID);
  await nativeShell(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.nativeCalls.some((call) => call.method === "requestPermissions"))).toBe(false);
  await page.getByRole("button", { name: "Enable notifications", exact: true }).click();
  await page.getByRole("switch", { name: /^Workout reminders/ }).check();
  await page.getByLabel("Reminder time", { exact: true }).fill("23:00");
  await page.getByRole("button", { name: "Save notification preferences" }).click();
  await expect(page.getByText("Choose a reminder time outside your quiet hours.", { exact: true })).toBeVisible();
  await page.getByLabel("Reminder time", { exact: true }).fill("18:30");
  await page.getByRole("button", { name: "Save notification preferences" }).click();
  await expect(page.getByText("Notification preferences saved on this device.", { exact: true })).toBeVisible();
  const pending = await page.evaluate(() => window.nativePendingNotifications);
  expect(pending).toHaveLength(3);
  expect(pending.map((item) => item.schedule.on.weekday).sort()).toEqual([2, 4, 6]);
  expect(pending[0].schedule.on.hour).toBe(18);
  expect(pending[0].schedule.on.minute).toBe(30);
  expect(pending[0].isExactNotification).toBe(false);
  expect(await page.evaluate(() => window.nativeCalls.some((call) => call.method === "changeExactNotificationSetting"))).toBe(false);
  await page.evaluate((userId) => window.emitNative("localNotificationActionPerformed", { notification: { id: 41002, extra: { kind: "workout-reminder", userId } } }), USER_ID);
  await expect(page).toHaveURL(/\/plan$/);
  // A notification changes the URL before the lazy destination finishes loading.
  await expect(page.getByRole("heading", { name: "Your plan", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu", exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.length)).toBe(0);
});

test("native rest adjustments replace one alarm and ending cancels it", async ({ page, app }) => {
  expect(app.plan).toBeTruthy();
  await nativeShell(page);
  await page.goto("/plan?day=Monday");
  await page.evaluate(() => { window.nativeNotificationPermission = "granted"; });
  await page.getByRole("button", { name: "Start this workout", exact: true }).click();
  await page.getByRole("button", { name: "Complete set 1", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.filter((item) => item.id === 42001).length)).toBe(1);
  const before = await page.evaluate(() => window.nativePendingNotifications.find((item) => item.id === 42001).schedule.at);
  await page.getByRole("button", { name: "Add 15 seconds", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.find((item) => item.id === 42001)?.schedule.at)).not.toBe(before);
  const after = await page.evaluate(() => window.nativePendingNotifications.filter((item) => item.id === 42001));
  expect(after).toHaveLength(1);
  expect(new Date(after[0].schedule.at) - new Date(before)).toBe(15000);
  await page.getByRole("button", { name: "End", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.filter((item) => item.id === 42001).length)).toBe(0);
  await page.getByRole("button", { name: "Complete set 2", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.filter((item) => item.id === 42001).length)).toBe(1);
  await page.getByRole("button", { name: "Pause or exit workout", exact: true }).click();
  await page.getByRole("button", { name: "Save & exit", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.filter((item) => item.id === 42001).length)).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fitbae-active-workout")).restEndsAt)).toBeNull();
});

test("native denied permission saves opt-in without scheduling and ignores another account's taps", async ({ page, app }, testInfo) => {
  expect(app.user.id).toBe(USER_ID);
  await nativeShell(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.evaluate(() => { window.nativeNotificationPermission = "denied"; window.dispatchEvent(new Event("focus")); });
  await page.getByRole("switch", { name: /^Workout reminders/ }).check();
  await page.getByRole("button", { name: "Save notification preferences" }).click();
  await expect(page.getByText("Preferences saved on this device. Enable notifications to receive reminders.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.nativePendingNotifications)).toHaveLength(0);
  await page.evaluate(() => window.emitNative("localNotificationActionPerformed", { notification: { id: 41002, extra: { kind: "workout-reminder", userId: "someone-else" } } }));
  await expect(page).toHaveURL(/settings/);
  await page.getByRole("button", { name: "Enable notifications", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.length)).toBe(3);
  await page.getByRole("button", { name: "Send test alert", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.nativePendingNotifications.some((item) => item.id === 42002))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { name: "Notifications", exact: true }).locator("../..").screenshot({ path: testInfo.outputPath("notifications-mobile.png"), animations: "disabled" });
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
