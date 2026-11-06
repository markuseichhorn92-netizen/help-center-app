"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Look C (wie angebot.fit-inn-trier.de): gilt für alle öffentlichen Seiten, nicht für den Teambereich.
export default function LookC({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return <>{children}</>;
  return <div data-theme="c" className="lc">{children}</div>;
}
