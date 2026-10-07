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
  if (!status) return compact ? <div className="h-[31px] border-t border-line md:hidden dark:border-[#1d4650]" aria-hidden /> : <span className="hidden h-9 w-64 md:inline-block" aria-hidden />;
  const dot = (
    <span className={`h-2 w-2 shrink-0 rounded-full ${status.open ? 'hc-live bg-[#2e9d6b]' : 'bg-[#9aa9ae]'}`} aria-hidden />
  );
  if (compact) {
    return (
      <p className="flex items-center justify-center gap-2 border-t border-line px-4 py-1.5 text-xs font-semibold text-p7 md:hidden dark:border-[#1d4650] dark:text-[#8ccbd9]">
        {dot}<span className="sr-only">{status.detail}. </span>{status.label}
      </p>
    );
  }
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-p7 md:inline-flex dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]" title={status.detail}>
      {dot}<span className="sr-only">{status.detail}. </span>{status.label}
    </span>
  );
}
