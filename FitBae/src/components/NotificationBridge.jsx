import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/lib/supabase";
import { nativeNotifications, notificationScheduler } from "@/lib/notifications";
import { notificationDestination } from "@/lib/notificationConfig";

function draft() {
  try { return JSON.parse(localStorage.getItem("fitbae-active-workout")); }
  catch { return null; }
}

export function NotificationBridge() {
  const navigate = useNavigate();
  const navigation = useRef(navigate);
  navigation.current = navigate;
  useEffect(() => {
    let disposed = false, initialized = false, pendingAction = null;
    const report = (error) => {
      if (!disposed) window.dispatchEvent(new CustomEvent("fitbae-notification-status", { detail: { error: error ? "Could not update device alerts. Open notification preferences to retry." : "" } }));
    };
    const open = (notification) => {
      if (disposed) return;
      if (!initialized) { pendingAction = notification; return; }
      const destination = notificationDestination(notification, notificationScheduler.currentUser(), draft());
      if (destination) navigation.current(destination);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (disposed) return;
      const id = session?.user?.id || null;
      const changed = notificationScheduler.currentUser() !== id;
      // Do not await Supabase operations inside an auth callback.
      notificationScheduler.setUser(id).then(async () => {
        if (disposed) return;
        if (changed) {
          const saved = draft();
          if (saved?.userId === id && !saved.paused && saved.restEndsAt > Date.now()) await notificationScheduler.rest(id, saved.restEndsAt);
        }
      }).catch(report);
      initialized = true;
      if (pendingAction) { const action = pendingAction; pendingAction = null; open(action); }
    });
    const listeners = nativeNotifications ? [
      LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => open(notification)),
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) notificationScheduler.refresh().then(() => report()).catch(report);
      }),
    ] : [];
    return () => {
      disposed = true;
      subscription.unsubscribe();
      listeners.forEach((listener) => listener.then((handle) => handle.remove()).catch(() => {}));
    };
  }, []);
  return null;
}
