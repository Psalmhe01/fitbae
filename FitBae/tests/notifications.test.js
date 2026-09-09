import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutReminders, DEFAULT_NOTIFICATION_PREFERENCES as defaults, isQuietTime, normalizeNotificationPreferences, notificationDestination, REST_NOTIFICATION_ID, validateNotificationPreferences } from "../src/lib/notificationConfig.js";
import { createNotificationScheduler } from "../src/lib/notificationScheduler.js";

function setup(permission = "granted") {
  const values = new Map(), pending = new Map();
  const calls = [];
  const plugin = {
    async checkPermissions() { return { display: permission }; },
    async checkExactNotificationSetting() { return { exact_alarm: "denied" }; },
    async createChannel() {},
    async getDeliveredNotifications() { return { notifications: [{ id: 999 }, { id: REST_NOTIFICATION_ID }] }; },
    async removeDeliveredNotifications(value) { calls.push(["remove", value]); },
    async cancel({ notifications }) { calls.push(["cancel", notifications]); notifications.forEach(({ id }) => pending.delete(id)); },
    async schedule({ notifications }) { calls.push(["schedule", notifications]); notifications.forEach((item) => pending.set(item.id, item)); },
  };
  const scheduler = createNotificationScheduler({ plugin, native: true, storage: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) } });
  return { scheduler, plugin, pending, calls };
}

test("notification defaults are opt-in and corrupted settings are bounded", () => {
  assert.equal(normalizeNotificationPreferences(null).reminders, false);
  const prefs = normalizeNotificationPreferences({ days: [0, 1, 1, 7, 8, "2"], time: "25:12", reminders: "yes" });
  assert.deepEqual(prefs.days, [1, 7]);
  assert.equal(prefs.time, "18:00");
  assert.equal(prefs.reminders, false);
});

test("quiet hours cover overnight and same-day windows with exclusive end", () => {
  assert.equal(isQuietTime("22:00", "22:00", "07:00"), true);
  assert.equal(isQuietTime("06:59", "22:00", "07:00"), true);
  assert.equal(isQuietTime("07:00", "22:00", "07:00"), false);
  assert.equal(isQuietTime("12:30", "12:00", "13:00"), true);
  assert.match(validateNotificationPreferences({ ...defaults, reminders: true, time: "23:00" }), /outside/);
  assert.match(validateNotificationPreferences({ ...defaults, reminders: true, days: [] }), /day/);
  assert.match(validateNotificationPreferences({ ...defaults, time: "" }), /valid/);
  assert.match(validateNotificationPreferences({ ...defaults, quietEnd: "22:00" }), /different/);
});

test("weekly reminders use local calendar components, stable IDs and no exact-alarm prompt", () => {
  const result = buildWorkoutReminders("boo", { ...defaults, reminders: true, days: [1, 2], time: "07:30" });
  assert.equal(result.length, 2);
  assert.deepEqual(result[1].schedule, { on: { weekday: 2, hour: 7, minute: 30, second: 0 }, repeats: true });
  assert.equal(result[1].id, 41002);
  assert.equal(result[1].isExactNotification, false);
  assert.deepEqual(buildWorkoutReminders("boo", defaults), []);
});

test("notification taps accept only known destinations for the signed-in account", () => {
  assert.equal(notificationDestination({ id: 41002, extra: { kind: "workout-reminder", userId: "boo", url: "https://evil.test" } }, "boo"), "/plan");
  assert.equal(notificationDestination({ id: 41002, extra: { kind: "workout-reminder", userId: "boo" } }, "babe"), null);
  const rest = { id: REST_NOTIFICATION_ID, extra: { kind: "rest", userId: "boo" } };
  assert.equal(notificationDestination(rest, "boo", { userId: "boo", workout: {}, paused: false }), "/workout");
  assert.equal(notificationDestination(rest, "boo", { userId: "boo", workout: {}, paused: true }), null);
  assert.equal(notificationDestination(rest, "boo", null), null);
});

test("denied permission stores preferences but never schedules or requests permission", async () => {
  const { scheduler, calls } = setup("denied");
  await scheduler.setUser("boo");
  await scheduler.save("boo", { ...defaults, reminders: true });
  await scheduler.rest("boo", Date.now() + 60000);
  assert.equal(scheduler.read("boo").reminders, true);
  assert.equal(calls.some(([name]) => name === "schedule"), false);
});

test("rapid rest adjustments leave one latest alarm and ending cancels it", async () => {
  const { scheduler, pending } = setup();
  await scheduler.setUser("boo");
  const end = Date.now() + 60000;
  await Promise.all([scheduler.rest("boo", end), scheduler.rest("boo", end + 15000)]);
  assert.equal(pending.size, 1);
  assert.equal(pending.get(REST_NOTIFICATION_ID).schedule.at.getTime(), end + 15000);
  assert.equal(pending.get(REST_NOTIFICATION_ID).isExactNotification, false);
  await scheduler.rest("boo", null);
  assert.equal(pending.size, 0);
});

test("logout wins over a native schedule in flight and removes only owned notifications", async () => {
  const { scheduler, plugin, pending, calls } = setup();
  await scheduler.setUser("boo");
  const original = plugin.schedule;
  let release, started;
  const start = new Promise((resolve) => { started = resolve; });
  plugin.schedule = async (value) => { started(); await new Promise((resolve) => { release = resolve; }); await original(value); };
  const rest = scheduler.rest("boo", Date.now() + 60000);
  await start;
  const logout = scheduler.setUser(null);
  release();
  await Promise.all([rest, logout]);
  assert.equal(pending.size, 0);
  for (const [name, value] of calls) if (name === "remove") assert.deepEqual(value.notifications.map((item) => item.id), [REST_NOTIFICATION_ID]);
});

test("accounts have isolated preferences and stale callers cannot cancel another user's alarm", async () => {
  const { scheduler, pending } = setup();
  await scheduler.setUser("boo");
  await scheduler.save("boo", { ...defaults, reminders: true });
  assert.equal(pending.size, 3);
  await scheduler.setUser("babe");
  assert.equal(pending.size, 0);
  assert.equal(scheduler.read("babe").reminders, false);
  await scheduler.rest("babe", Date.now() + 60000);
  await scheduler.rest("boo", null);
  assert.equal(pending.size, 1);
  await scheduler.save("babe", { ...defaults, restAlerts: false });
  assert.equal(pending.size, 0);
});

test("expired timers and disabled rest alerts don't generate stale notifications", async () => {
  const { scheduler, pending } = setup();
  await scheduler.setUser("boo");
  await scheduler.rest("boo", Date.now() - 1);
  assert.equal(pending.size, 0);
  await scheduler.save("boo", { ...defaults, restAlerts: false });
  await scheduler.rest("boo", Date.now() + 60000);
  assert.equal(pending.size, 0);
});

test("a native failure doesn't poison the scheduling queue", async () => {
  const { scheduler, plugin, pending } = setup();
  await scheduler.setUser("boo");
  const original = plugin.schedule;
  plugin.schedule = async () => { throw new Error("unavailable"); };
  await assert.rejects(scheduler.rest("boo", Date.now() + 60000));
  plugin.schedule = original;
  await scheduler.rest("boo", Date.now() + 60000);
  assert.equal(pending.size, 1);
});
