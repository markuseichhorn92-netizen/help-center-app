"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";

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
  useEffect(() => {
    // Auto-open chat widget when it's ready
    const checkAndOpenWidget = () => {
      if (window.$respond?.do) {
        window.$respond.do('chat:open');
      }
    };

    // Try immediately and then with delays
    checkAndOpenWidget();
    const timer1 = setTimeout(checkAndOpenWidget, 500);
    const timer2 = setTimeout(checkAndOpenWidget, 1500);
    const timer3 = setTimeout(checkAndOpenWidget, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <>
      {/* respond.io Widget Script */}
      <Script
        id="respondio__widget"
        src="https://cdn.respond.io/webchat/widget/widget.js?cId=5109ea42b3bc2f831ad35ad0db15280"
        strategy="afterInteractive"
        onLoad={() => {
          // Open widget once script loads
          setTimeout(() => {
            if (window.$respond?.do) {
              window.$respond.do('chat:open');
            }
          }, 500);
        }}
      />

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
            Chatte direkt mit unserem Team. Der Chat öffnet sich automatisch.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 max-w-lg w-full mb-8">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-apple-gray-100 dark:border-dark-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text">Schnelle Antworten</h3>
                <p className="text-sm text-apple-gray-500 dark:text-dark-text-secondary mt-1">
                  Unser Team antwortet in der Regel innerhalb weniger Minuten.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-apple-gray-100 dark:border-dark-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text">Erreichbarkeit</h3>
                <p className="text-sm text-apple-gray-500 dark:text-dark-text-secondary mt-1">
                  Mo-Fr 08:00-21:00 Uhr, Sa-So 10:00-18:00 Uhr
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fallback Button */}
        <button
          onClick={() => {
            if (window.$respond?.do) {
              window.$respond.do('chat:open');
            }
          }}
          className="px-8 py-4 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          💬 Chat öffnen
        </button>

        {/* Back Link */}
        <Link
          href="/"
          className="mt-6 text-sm text-apple-gray-500 dark:text-dark-text-secondary hover:text-brand transition-colors"
        >
          ← Zurück zum Hilfe-Center
        </Link>
      </div>
    </>
  );
}
