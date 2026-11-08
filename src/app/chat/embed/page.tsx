"use client";

import { useEffect } from "react";
import { openMagicline } from "@/lib/help/magicline-chat";

/**
 * Chat-Seite zum Einbetten (Iframe): das globale Magicline-Widget (Root-Layout) wird geöffnet.
 */
export default function ChatEmbedPage() {
  useEffect(() => openMagicline(), []);

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
