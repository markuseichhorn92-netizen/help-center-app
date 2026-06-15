"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability (Vercel logs / console).
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-apple-gray-600 dark:text-dark-text tracking-tight mb-3">
        Etwas ist schiefgelaufen
      </h1>
      <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-8 max-w-md mx-auto">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder kehre zur Startseite zurück.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.023 9.348h4.992V4.356M3.985 14.652H-.007v4.992M4.93 5.49A8.25 8.25 0 0119.07 8.51m.005 7.99A8.25 8.25 0 014.93 18.51" />
          </svg>
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1C1C1E] text-apple-gray-600 dark:text-dark-text font-semibold rounded-full border border-apple-gray-200 dark:border-dark-border hover:border-brand/30 transition-all duration-300"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
