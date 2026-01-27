"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "Artikel",
    href: "/admin/articles",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: "Tickets",
    href: "/admin/tickets",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  {
    name: "Kontakte",
    href: "/admin/contacts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: "Kategorien",
    href: "/admin/categories",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: "Knowledge",
    href: "/admin/knowledge",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<"online" | "offline">("offline");
  const [statusLoading, setStatusLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "disabled" | "enabled">("unsupported");
  const [pushLoading, setPushLoading] = useState(false);

  // Load admin status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/admin/presence/status");
        if (res.ok) {
          const data = await res.json();
          setAdminStatus(data.status || "offline");
        }
      } catch (error) {
        console.error("Failed to load admin status:", error);
      } finally {
        setStatusLoading(false);
      }
    };
    loadStatus();
  }, []);

  // Check push notification status on mount
  useEffect(() => {
    const checkPushStatus = async () => {
      // Check if push notifications are supported
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatus("unsupported");
        return;
      }

      // Check notification permission
      if (Notification.permission === "denied") {
        setPushStatus("denied");
        return;
      }

      // Check if we have an active subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushStatus(subscription ? "enabled" : "disabled");
      } catch {
        setPushStatus("disabled");
      }
    };
    checkPushStatus();
  }, []);

  // Toggle push notifications
  const togglePush = async () => {
    if (pushStatus === "unsupported" || pushStatus === "denied") return;

    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (pushStatus === "enabled") {
        // Unsubscribe
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
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushStatus("denied");
          return;
        }

        // Get VAPID public key
        const keyRes = await fetch("/api/admin/push/vapid-key");
        if (!keyRes.ok) {
          console.error("Failed to get VAPID key");
          return;
        }
        const { publicKey } = await keyRes.json();

        // Convert VAPID key to Uint8Array
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        };

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Send subscription to server
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
  };

  // Send heartbeat every 30 seconds when online
  useEffect(() => {
    if (adminStatus !== "online") return;

    const sendHeartbeat = () => {
      fetch("/api/admin/presence/heartbeat", { method: "POST" }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [adminStatus]);

  const toggleStatus = async () => {
    const newStatus = adminStatus === "online" ? "offline" : "online";
    setStatusLoading(true);
    try {
      const res = await fetch("/api/admin/presence/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAdminStatus(newStatus);
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    if (href === "/admin/articles") {
      return pathname === "/admin/articles" || pathname?.startsWith("/admin/edit") || pathname?.startsWith("/admin/new");
    }
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <header className="bg-white border-b border-apple-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="font-bold text-apple-gray-600 text-lg hidden sm:block">Admin</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-brand/10 text-brand"
                    : "text-apple-gray-500 hover:bg-apple-gray-100 hover:text-apple-gray-600"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Push Debug Link */}
            <Link
              href="/admin/debug-push"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
              title="Push Debug"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </Link>

            {/* Push Notification Toggle */}
            {pushStatus !== "unsupported" && (
              <button
                onClick={togglePush}
                disabled={pushLoading || pushStatus === "denied"}
                className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
                  pushStatus === "enabled"
                    ? "text-brand bg-brand/10 hover:bg-brand/20"
                    : pushStatus === "denied"
                    ? "text-red-400 bg-red-50 cursor-not-allowed"
                    : "text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100"
                } ${pushLoading ? "opacity-50 cursor-wait" : ""}`}
                title={
                  pushStatus === "enabled"
                    ? "Push-Benachrichtigungen aktiv"
                    : pushStatus === "denied"
                    ? "Push-Benachrichtigungen blockiert - bitte in Browser-Einstellungen erlauben"
                    : "Push-Benachrichtigungen aktivieren"
                }
              >
                {pushStatus === "enabled" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                ) : pushStatus === "denied" ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364L5.636 5.636" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                )}
              </button>
            )}

            {/* Online/Offline Toggle */}
            <button
              onClick={toggleStatus}
              disabled={statusLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                adminStatus === "online"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              } ${statusLoading ? "opacity-50 cursor-wait" : ""}`}
              title={adminStatus === "online" ? "Du bist online - Kunden sehen dich als verfügbar" : "Du bist offline - Kunden sehen dich als nicht verfügbar"}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${
                adminStatus === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`} />
              <span className="hidden sm:inline">
                {statusLoading ? "..." : adminStatus === "online" ? "Online" : "Offline"}
              </span>
            </button>

            {/* Dashboard Link */}
            <a
              href="https://fitinntrierdashboard.org/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </a>

            {/* Home Link */}
            <Link
              href="/"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
              title="Zur Website"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Abmelden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-apple-gray-100 animate-fade-in">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-brand/10 text-brand"
                      : "text-apple-gray-500 hover:bg-apple-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
              <a
                href="https://fitinntrierdashboard.org/admin"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mt-1 text-apple-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span>Dashboard</span>
                <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <Link
                href="/admin/debug-push"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-apple-gray-500 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>Push Debug</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
