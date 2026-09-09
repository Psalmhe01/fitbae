import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase";
import { parseNativeAuthCallback } from "@/lib/mobileConfig";

// A cold launch and appUrlOpen can deliver the same single-use PKCE code.
// Share that exchange, including across React StrictMode effect re-mounts.
const exchanges = new Map();
function exchangeOnce(code) {
  if (!exchanges.has(code)) {
    if (exchanges.size >= 10) exchanges.delete(exchanges.keys().next().value);
    exchanges.set(code, supabase.auth.exchangeCodeForSession(code).then(({ error }) => ({ error })));
  }
  return exchanges.get(code);
}

export function NativeBridge() {
  const navigate = useNavigate();
  const navigation = useRef(navigate);
  navigation.current = navigate;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const openUrl = async ({ url }) => {
      const callback = parseNativeAuthCallback(url);
      if (!callback || disposed) return;
      try {
        if (callback.error || !callback.code) throw new Error("Invalid callback");
        const { error } = await exchangeOnce(callback.code);
        if (error) throw error;
        if (!disposed) navigation.current(callback.recovery ? "/auth?mode=reset" : "/dashboard", { replace: true });
      } catch {
        if (!disposed) navigation.current("/auth?nativeError=1", { replace: true });
      } finally {
        // Android Custom Tabs close on the redirect; close() also supports iOS.
        await Browser.close().catch(() => {});
      }
    };
    const urlListener = App.addListener("appUrlOpen", openUrl);
    const stateListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    const backListener = App.addListener("backButton", ({ canGoBack }) => {
      if (document.querySelector('[role="dialog"]')) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else if (canGoBack) window.history.back();
      else App.minimizeApp();
    });
    App.getLaunchUrl().then((launch) => { if (launch) return openUrl(launch); }).catch(() => {});
    return () => {
      disposed = true;
      urlListener.then((listener) => listener.remove());
      stateListener.then((listener) => listener.remove());
      backListener.then((listener) => listener.remove());
    };
  // Read launch URLs once, not on every route change (navigate's identity changes).
  }, []);
  return null;
}
