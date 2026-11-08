'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { MAGICLINE_CHAT_SCRIPT_ID, MAGICLINE_CHAT_SRC, showsChatWidget } from '@/lib/help/magicline-chat';

// Lädt den Magicline-Chatbot auf allen öffentlichen Seiten (Teambereich ausgenommen).
export default function ChatWidgetLoader() {
  const pathname = usePathname();
  if (!showsChatWidget(pathname)) return null;
  return <Script id={MAGICLINE_CHAT_SCRIPT_ID} src={MAGICLINE_CHAT_SRC} strategy="afterInteractive" />;
}
