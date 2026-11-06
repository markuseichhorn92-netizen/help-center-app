'use client';

import { useEffect, useState } from 'react';
import { getOpenStatus, type OpeningData, type OpenStatus } from '@/lib/help/hours';

// Status wird im Browser berechnet (aktuelle Uhrzeit, Europe/Berlin) – Seite bleibt statisch.
export default function OpenPill({ data, compact = false }: { data: OpeningData | null; compact?: boolean }) {
  const [status, setStatus] = useState<OpenStatus | null>(null);
  useEffect(() => {
    const tick = () => setStatus(getOpenStatus(data));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [data]);

  // Platz reservieren, damit der Header nach dem Laden nicht springt (CLS).
  if (!status) return compact ? <div className="h-[31px] md:hidden" aria-hidden /> : <span className="lc-pill-d h-10 w-64" aria-hidden />;
  const dot = (
    <span className={`h-2 w-2 shrink-0 rounded-full ${status.open ? 'hc-live bg-[#2e9d6b]' : 'bg-[#9aa9ae]'}`} aria-hidden />
  );
  if (compact) {
    return (
      <p className="lc-status">
        {dot}<span className="sr-only">{status.detail}. </span>{status.label}
      </p>
    );
  }
  return (
    <span className="lc-pill lc-pill-d" title={status.detail}>
      {dot}<span className="sr-only">{status.detail}. </span>{status.label}
    </span>
  );
}
