export const WEEKDAYS = [[2, "Mon"], [3, "Tue"], [4, "Wed"], [5, "Thu"], [6, "Fri"], [7, "Sat"], [1, "Sun"]];
export const REST_NOTIFICATION_ID = 42001;
export const TEST_NOTIFICATION_ID = 42002;
export const REMINDER_IDS = WEEKDAYS.map(([day]) => 41000 + day);
export const MANAGED_IDS = [...REMINDER_IDS, REST_NOTIFICATION_ID, TEST_NOTIFICATION_ID];
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  restAlerts: true, reminders: false, days: [2, 4, 6], time: "18:00",
  quietHours: true, quietStart: "22:00", quietEnd: "07:00",
};
const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function normalizeNotificationPreferences(value) {
  const source = value && typeof value === "object" ? value : {};
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    ...Object.fromEntries(["restAlerts", "reminders", "quietHours"].map((key) => [key, typeof source[key] === "boolean" ? source[key] : defaults[key]])),
    ...Object.fromEntries(["time", "quietStart", "quietEnd"].map((key) => [key, validTime(source[key]) ? source[key] : defaults[key]])),
    days: Array.isArray(source.days) ? [...new Set(source.days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))] : [...defaults.days],
  };
}

export function isQuietTime(time, start, end) {
  return start === end || (start < end ? time >= start && time < end : time >= start || time < end);
}

export function validateNotificationPreferences(value) {
  if (![value.time, value.quietStart, value.quietEnd].every(validTime)) return "Enter valid reminder and quiet-hour times.";
  if (value.reminders && !value.days.length) return "Choose at least one reminder day.";
  if (value.quietHours && value.quietStart === value.quietEnd) return "Quiet hours must have different start and end times.";
  if (value.reminders && value.quietHours && isQuietTime(value.time, value.quietStart, value.quietEnd)) return "Choose a reminder time outside your quiet hours.";
  return "";
}

export function buildWorkoutReminders(userId, preferences) {
  const prefs = normalizeNotificationPreferences(preferences);
  if (!userId || !prefs.reminders || validateNotificationPreferences(prefs)) return [];
  const [hour, minute] = prefs.time.split(":").map(Number);
  return prefs.days.map((weekday) => ({
    id: 41000 + weekday, title: "Make a little time for you",
    body: "Your next workout is ready in FitBae.",
    channelId: "fitbae-workouts", smallIcon: "ic_stat_fitbae", isExactNotification: false,
    schedule: { on: { weekday, hour, minute, second: 0 }, repeats: true },
    extra: { kind: "workout-reminder", userId },
  }));
}

export function notificationDestination(notification, userId, draft) {
  if (!userId || notification?.extra?.userId !== userId) return null;
  if (REMINDER_IDS.includes(notification.id) && notification.extra.kind === "workout-reminder") return "/plan";
  if (notification.id === TEST_NOTIFICATION_ID && notification.extra.kind === "test") return "/settings";
  if (notification.id === REST_NOTIFICATION_ID && notification.extra.kind === "rest" && draft?.userId === userId && draft.workout && !draft.paused) return "/workout";
  return null;
}
