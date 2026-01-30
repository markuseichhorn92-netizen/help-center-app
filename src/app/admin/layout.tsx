"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show header on login page
  const isLoginPage = pathname === "/admin/login";
  
  // Check if on ticket detail page (has its own mobile header)
  const isTicketDetailPage = pathname?.match(/^\/admin\/tickets\/[^/]+$/);

  // Listen for messages from Service Worker (for notification clicks)
  useEffect(() => {
    if (isLoginPage) return;
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      console.log("[App] Received message from SW:", event.data);
      if (event.data?.type === "NAVIGATE" && event.data?.url) {
        router.push(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [isLoginPage, router]);

  // Register service worker for push notifications
  useEffect(() => {
    if (isLoginPage) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        (registration) => {
          console.log("[SW] Service Worker registered:", registration.scope);
        },
        (error) => {
          console.error("[SW] Service Worker registration failed:", error);
        }
      );
    }
  }, [isLoginPage]);

  // Send heartbeat to indicate admin is online (for portal live chat)
  useEffect(() => {
    if (isLoginPage) return;

    const sendHeartbeat = async () => {
      try {
        await fetch("/api/admin/presence/heartbeat", { method: "POST" });
      } catch {
        // Silently fail
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    // Also send heartbeat on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <AdminHeader />
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 md:py-8 ${isTicketDetailPage ? 'py-0' : 'py-6'}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
