"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    JexityChat?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      readonly isOpen: boolean;
      subscribe: (cb: (isOpen: boolean) => void) => () => void;
    };
  }
}

/**
 * Dedicated, mobile-only fullscreen chat page meant to be embedded in an iframe.
 * The global jexitychat widget (loaded in the root layout) is forced open and
 * kept open, and its close control is hidden so the chat can't be dismissed.
 *
 * On mobile the widget's own window (`.jex-chat-window`) already renders
 * fullscreen (position:fixed; inset:0; 100dvh), so we only need to:
 *   1) hide the close button,
 *   2) open the chat and re-open it if it ever gets closed.
 *
 * Note: the jexitychat backend only initialises on domains authorised in the
 * jexity dashboard and on paths allowed by its path rules — make sure the
 * embedding domain is authorised and this route is allowed there.
 */
export default function ChatEmbedPage() {
  useEffect(() => {
    // 1) Hide the close/dismiss control so the chat cannot be closed by the user.
    const STYLE_ID = "jexity-embed-style";
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        .jex-header-close { display: none !important; }
      `;
      document.head.appendChild(style);
    }

    // 2) Force the chat open and keep it open.
    let unsubscribe: (() => void) | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const ensureOpen = (): boolean => {
      const api = window.JexityChat;
      if (!api) return false;
      if (!api.isOpen) api.open();
      if (!unsubscribe && typeof api.subscribe === "function") {
        unsubscribe = api.subscribe((isOpen) => {
          // If anything closes the chat (swipe, programmatic), re-open it.
          if (!isOpen && !cancelled) {
            setTimeout(() => {
              if (!cancelled) window.JexityChat?.open();
            }, 0);
          }
        });
      }
      return true;
    };

    if (!ensureOpen()) {
      // Widget script may still be loading (lazyOnload) — poll until ready.
      poll = setInterval(() => {
        if (ensureOpen() && poll) clearInterval(poll);
      }, 300);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Loading state shown until the chat window mounts on top of it.
  return (
    <div className="fixed inset-0 bg-apple-gray-50 dark:bg-dark-bg flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
        <p className="text-sm text-apple-gray-500 dark:text-dark-text-secondary">
          Chat wird geladen…
        </p>
      </div>
    </div>
  );
}
