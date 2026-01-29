"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Anonymous page view tracker - no cookies, no fingerprinting
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip admin and API routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;

    // Send tracking request
    const track = async () => {
      try {
        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer || undefined,
          }),
        });
      } catch {
        // Silently fail - don't affect user experience
      }
    };

    // Small delay to not block page render
    const timeout = setTimeout(track, 100);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null; // This component renders nothing
}
