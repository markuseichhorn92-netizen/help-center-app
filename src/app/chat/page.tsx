"use client";

import { useEffect } from "react";
import Link from "next/link";

declare global {
  interface Window {
    $respond?: {
      do?: (action: string) => void;
    };
  }
}

export default function ChatPage() {
  useEffect(() => {
    // Auto-open chat when widget is ready
    const openChat = () => {
      if (window.$respond?.do) {
        window.$respond.do('chat:open');
        return true;
      }
      return false;
    };

    // Try immediately
    if (openChat()) return;

    // Poll until ready
    const interval = setInterval(() => {
      if (openChat()) clearInterval(interval);
    }, 500);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[80vh] bg-apple-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-apple-gray-600 dark:text-dark-text mb-2">
          Live-Chat
        </h1>
        <p className="text-apple-gray-500 dark:text-dark-text-secondary">
          Der Chat öffnet sich gleich unten rechts...
        </p>
      </div>

      <button
        onClick={() => window.$respond?.do?.('chat:open')}
        className="px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        💬 Chat öffnen
      </button>

      <Link href="/" className="mt-6 text-sm text-apple-gray-500 hover:text-brand transition-colors">
        ← Zurück zum Hilfe-Center
      </Link>
    </div>
  );
}
