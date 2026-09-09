import { buildWorkoutReminders, MANAGED_IDS, REMINDER_IDS, REST_NOTIFICATION_ID, TEST_NOTIFICATION_ID, normalizeNotificationPreferences, validateNotificationPreferences } from "./notificationConfig.js";

// Serialize native writes so rapid adjustments and account changes cannot
// leave an older alarm behind. Only this feature's notification IDs are owned.
export function createNotificationScheduler({ plugin, storage, native }) {
  let userId;
  let queue = Promise.resolve();
  let generation = 0;
  let restRevision = 0;
  const enqueue = (work) => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  const key = (id) => `fitbae-notifications-v1:${id}`;
  const read = (id) => {
    try { return normalizeNotificationPreferences(JSON.parse(storage.getItem(key(id)))); }
    catch { return normalizeNotificationPreferences(null); }
  };
  const cancel = (ids) => plugin.cancel({ notifications: ids.map((id) => ({ id })) });
  const channels = async () => {
    for (const [id, name, importance] of [["fitbae-workouts", "Workout reminders", 3], ["fitbae-rest", "Rest timer", 4]]) {
      try { await plugin.createChannel({ id, name, importance, visibility: 0, vibration: true }); }
      catch (error) { if (error.code !== "UNAVAILABLE" && error.code !== "UNIMPLEMENTED") throw error; }
    }
  };
  const sync = async (id, epoch) => {
    await cancel(REMINDER_IDS);
    if (!id || epoch !== generation || (await plugin.checkPermissions()).display !== "granted") return;
    await channels();
    const notifications = buildWorkoutReminders(id, read(id));
    if (epoch === generation && notifications.length) await plugin.schedule({ notifications });
  };
  return {
    read,
    currentUser: () => userId,
    setUser(id) {
      id = id || null;
      if (id === userId) return queue;
      userId = id;
      const epoch = ++generation;
      ++restRevision;
      if (!native) return Promise.resolve();
      return enqueue(async () => {
        await cancel(MANAGED_IDS);
        const delivered = await plugin.getDeliveredNotifications();
        const owned = (delivered.notifications || []).filter((item) => MANAGED_IDS.includes(item.id));
        if (owned.length) await plugin.removeDeliveredNotifications({ notifications: owned });
        await sync(id, epoch);
      });
    },
    refresh() {
      const id = userId, epoch = generation;
      return native ? enqueue(() => sync(id, epoch)) : Promise.resolve();
    },
    save(id, value) {
      if (!id || id !== userId) return Promise.reject(new Error("Sign in again before saving notification settings."));
      const error = validateNotificationPreferences(value);
      if (error) return Promise.reject(new Error(error));
      storage.setItem(key(id), JSON.stringify(normalizeNotificationPreferences(value)));
      const epoch = generation;
      return native ? enqueue(async () => {
        if (epoch !== generation) return;
        if (!value.restAlerts) await cancel([REST_NOTIFICATION_ID]);
        await sync(id, epoch);
      }) : Promise.resolve();
    },
    rest(id, endsAt) {
      if (id !== userId) return Promise.resolve();
      const revision = ++restRevision, epoch = generation;
      if (!native) return Promise.resolve();
      return enqueue(async () => {
        if (revision !== restRevision || epoch !== generation) return;
        await cancel([REST_NOTIFICATION_ID]);
        if (!endsAt || endsAt <= Date.now() || !id || id !== userId || !read(id).restAlerts) return;
        if ((await plugin.checkPermissions()).display !== "granted") return;
        const exact = await plugin.checkExactNotificationSetting();
        await channels();
        if (revision !== restRevision || epoch !== generation || endsAt <= Date.now()) return;
        await plugin.schedule({ notifications: [{
          id: REST_NOTIFICATION_ID, title: "Ready for your next set?",
          body: "Your rest timer has finished. Pick up when you are ready.",
          channelId: "fitbae-rest", smallIcon: "ic_stat_fitbae", foreground: true,
          isExactNotification: exact.exact_alarm === "granted",
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
          extra: { kind: "rest", userId: id },
        }] });
      });
    },
    test(id) {
      const epoch = generation;
      return enqueue(async () => {
        if (!native || !id || id !== userId || epoch !== generation) throw new Error("Sign in on the Android app to test an alert.");
        if ((await plugin.checkPermissions()).display !== "granted") throw new Error("Enable notifications first.");
        await channels();
        await cancel([TEST_NOTIFICATION_ID]);
        if (epoch !== generation) return;
        await plugin.schedule({ notifications: [{
          id: TEST_NOTIFICATION_ID, title: "You're all set",
          body: "FitBae notifications can reach this device.",
          channelId: "fitbae-workouts", smallIcon: "ic_stat_fitbae", isExactNotification: false,
          schedule: { at: new Date(Date.now() + 5000) }, extra: { kind: "test", userId: id },
        }] });
      });
    },
  };
}
