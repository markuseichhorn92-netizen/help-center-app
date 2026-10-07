"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Header/Footer-Hülle: Admin- und Chat-Seiten haben ihr eigenes Layout.
export default function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/chat")) return null;
  return <>{children}</>;
}
