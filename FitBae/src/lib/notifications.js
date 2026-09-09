import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { createNotificationScheduler } from "./notificationScheduler.js";

export const nativeNotifications = Capacitor.getPlatform() === "android";
export const notificationScheduler = createNotificationScheduler({
  plugin: LocalNotifications, native: nativeNotifications,
  storage: { getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
});

export async function notificationStatus() {
  if (nativeNotifications) {
    const permission = await LocalNotifications.checkPermissions();
    const exact = await LocalNotifications.checkExactNotificationSetting();
    return { permission: permission.display, exact: exact.exact_alarm === "granted" };
  }
  return { permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission, exact: false };
}

export async function requestExactAlarms() {
  if (nativeNotifications) await LocalNotifications.changeExactNotificationSetting();
}

export const requestPermission = async () => {
  if (nativeNotifications) return (await LocalNotifications.requestPermissions()).display;
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  return permission;
};

export const notifyRestComplete = async (userId) => {
  if (!notificationScheduler.read(userId).restAlerts) return;
  // Android already owns the alarm; never duplicate it on resume.
  if (nativeNotifications && (await LocalNotifications.checkPermissions()).display === "granted") return;
  // 1. System Notification
  try {
    if (
      !nativeNotifications && typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Rest Period Over!", {
        body: "Time to start your next set! Let's go.",
        icon: "/favicon.svg",
        silent: false,
      });
    }
  } catch (err) {
    console.warn(
      "System notification failed (standard behavior on some mobile browsers):",
      err,
    );
  }

  // Best-effort foreground fallback; browsers may suspend background audio.
  playNotificationSound();
};

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High A

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.5,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
    oscillator.addEventListener("ended", () => audioCtx.close().catch(() => {}), {
      once: true,
    });
  } catch (err) {
    console.warn("Audio notification failed:", err);
  }
};
