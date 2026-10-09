"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PushStatus = "unsupported" | "denied" | "disabled" | "enabled";

/** Theme: hell/dunkel, Startwert = Systemeinstellung (nur im Teambereich), gespeichert in localStorage('theme') */
export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }, []);
  return { dark, toggle };
}

/** Push-Schalter, Online-Status (Live-Chat-Sichtbarkeit) und Abmelden – wie bisher im AdminHeader */
export function useAdminControls() {
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<"online" | "offline">("offline");
  const [statusLoading, setStatusLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<PushStatus>("unsupported");
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/presence/status");
        if (res.ok) setAdminStatus((await res.json()).status || "offline");
      } catch (error) {
        console.error("Failed to load admin status:", error);
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setPushStatus("unsupported");
      if (Notification.permission === "denied") return setPushStatus("denied");
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushStatus(subscription ? "enabled" : "disabled");
      } catch {
        setPushStatus("disabled");
      }
    })();
  }, []);

  const togglePush = useCallback(async () => {
    if (pushStatus === "unsupported" || pushStatus === "denied") return;
    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (pushStatus === "enabled") {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/admin/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setPushStatus("disabled");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setPushStatus("denied");
        const keyRes = await fetch("/api/admin/push/vapid-key");
        if (!keyRes.ok) return console.error("Failed to get VAPID key");
        const { publicKey } = await keyRes.json();
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const raw = window.atob((publicKey + padding).replace(/-/g, "+").replace(/_/g, "/"));
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) key[i] = raw.charCodeAt(i);
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await fetch("/api/admin/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        setPushStatus("enabled");
      }
    } catch (error) {
      console.error("Failed to toggle push notifications:", error);
    } finally {
      setPushLoading(false);
    }
  }, [pushStatus]);

  const toggleStatus = useCallback(async () => {
    const next = adminStatus === "online" ? "offline" : "online";
    setStatusLoading(true);
    try {
      const res = await fetch("/api/admin/presence/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) setAdminStatus(next);
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setStatusLoading(false);
    }
  }, [adminStatus]);

  const logout = useCallback(async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }, [router]);

  return { adminStatus, statusLoading, toggleStatus, pushStatus, pushLoading, togglePush, logout };
}
