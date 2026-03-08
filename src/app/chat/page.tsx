"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

declare global {
  interface Window {
    $respond?: {
      do?: (action: string) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }
}

export default function ChatPage() {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Inject script directly into DOM
    if (!scriptLoaded.current) {
      scriptLoaded.current = true;
      
      const script = document.createElement('script');
      script.id = 'respondio__widget';
      script.src = 'https://cdn.respond.io/webchat/widget/widget.js?cId=5109ea42b3bc2f831ad35ad0db15280';
      script.async = true;
      document.body.appendChild(script);
    }

    // Poll for widget to be ready and open it
    const openWidget = () => {
      if (window.$respond?.do) {
        window.$respond.do('chat:open');
        return true;
      }
      return false;
    };

    // Keep trying until widget opens
    const interval = setInterval(() => {
      if (openWidget()) {
        clearInterval(interval);
      }
    }, 300);

    // Also try after common load times
    const timers = [500, 1000, 2000, 3000, 5000].map(ms => 
      setTimeout(openWidget, ms)
    );

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="min-h-[80vh] bg-apple-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-dark rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-apple-gray-600 dark:text-dark-text mb-2">
          Live-Chat
        </h1>
        <p className="text-apple-gray-500 dark:text-dark-text-secondary max-w-md">
          Chatte direkt mit unserem Team.
        </p>
      </div>

      {/* Loading indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-apple-gray-500 dark:text-dark-text-secondary">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm">Chat wird geladen...</span>
        </div>
      </div>

      {/* Manual Open Button */}
      <button
        onClick={() => {
          if (window.$respond?.do) {
            window.$respond.do('chat:open');
          } else {
            alert('Chat lädt noch... Bitte kurz warten.');
          }
        }}
        className="px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
      >
        💬 Chat jetzt öffnen
      </button>

      {/* Info */}
      <p className="mt-4 text-xs text-apple-gray-400 dark:text-dark-text-secondary text-center max-w-sm">
        Der Chat erscheint unten rechts. Falls nicht, klicke auf den Button oben.
      </p>

      {/* Back Link */}
      <Link
        href="/"
        className="mt-6 text-sm text-apple-gray-500 dark:text-dark-text-secondary hover:text-brand transition-colors"
      >
        ← Zurück zum Hilfe-Center
      </Link>
    </div>
  );
}
