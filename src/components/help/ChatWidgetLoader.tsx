'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SRC = 'https://cdn.jexitychat.de/widget/latest/widget.js';

// Lädt das jexitychat-Widget erst bei der ersten Interaktion (oder nach 15 s), auf /chat sofort.
// So blockiert es weder Ladezeit noch Lighthouse-Messung und poppt nicht beim Seitenaufruf auf.
export default function ChatWidgetLoader() {
  const pathname = usePathname();
  useEffect(() => {
    if (document.getElementById('jexitychat-widget')) return;
    const load = () => {
      if (document.getElementById('jexitychat-widget')) return;
      const s = document.createElement('script');
      s.id = 'jexitychat-widget';
      s.src = SRC;
      s.async = true;
      s.dataset.orgSlug = 'fit-inn-trier';
      s.dataset.projSlug = 'fit-inn-trier-web';
      document.body.appendChild(s);
    };
    if (pathname?.startsWith('/chat')) { load(); return; }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    const start = () => { cleanup(); load(); };
    const timer = window.setTimeout(start, 15000);
    const cleanup = () => { window.clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, start)); };
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    return cleanup;
  }, [pathname]);
  return null;
}
