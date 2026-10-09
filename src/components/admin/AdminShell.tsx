"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./ui/Pills";
import { CommandIcon, MoreIcon } from "./ui/icons";
import { PRIMARY_NAV } from "./nav";
import { useUnreadCount } from "./inboxStore";
import MoreSheet from "./MoreSheet";
import CommandPalette from "./CommandPalette";
import { ToastProvider } from "./ui/Toast";

/** Posteingang + Ticket-Ansicht nutzen die volle Höhe/Breite (eigene Spalten) */
function isFullBleed(path: string) {
  if (/^\/admin\/tickets\/(new|trash|spam-folder)$/.test(path)) return false;
  return path === "/admin/tickets" || /^\/admin\/tickets\/[^/]+$/.test(path);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const unread = useUnreadCount();
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const fullBleed = isFullBleed(pathname);
  // Auf Handy: In der Ticket-Ansicht übernimmt die Antwortleiste den unteren Rand
  const hideBottomNav = /^\/admin\/tickets\/[^/]+$/.test(pathname) && fullBleed;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span aria-label={`${n} neue`} className="absolute -right-1.5 -top-1 min-w-5 rounded-full bg-adm-apricot px-1.5 text-center text-[11px] font-bold leading-5 text-adm-on-apricot">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <ToastProvider>
    <div className="adm-root min-h-dvh">
      {/* Desktop: Seitenleiste */}
      <nav aria-label="Hauptnavigation" className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col items-center gap-1 bg-adm-teal py-4 text-adm-on-teal lg:flex">
        <Link href="/admin/tickets" aria-label="Fit-Inn Teambereich – Posteingang" className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-adm-apricot text-lg font-extrabold text-adm-on-apricot">
          F
        </Link>
        {PRIMARY_NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cx("relative flex w-[72px] flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold", active ? "bg-white/15" : "opacity-80 hover:bg-white/10 hover:opacity-100")}
            >
              <span className="relative">
                <n.icon width={24} height={24} />
                {n.key === "inbox" && <Badge n={unread} />}
              </span>
              {n.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className="flex w-[72px] flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold opacity-80 hover:bg-white/10 hover:opacity-100">
          <MoreIcon width={24} height={24} />
          Mehr
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Befehle und Suche öffnen (Strg+K)"
          className="mt-auto flex w-[72px] flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold opacity-80 hover:bg-white/10 hover:opacity-100"
        >
          <CommandIcon width={22} height={22} />
          <span className="adm-mono">⌘K</span>
        </button>
      </nav>

      <div className={cx("lg:pl-[84px]", fullBleed ? "" : "px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8")}>
        {fullBleed ? children : <div className="mx-auto max-w-7xl">{children}</div>}
      </div>

      {/* Handy: untere Navigation (Daumenzone) */}
      {!hideBottomNav && (
        <nav aria-label="Hauptnavigation" className="adm-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-adm-line bg-adm-surface lg:hidden">
          <ul className="mx-auto flex max-w-xl items-stretch justify-around">
            {PRIMARY_NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <li key={n.key} className="flex-1">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cx("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-adm-teal dark:text-adm-apricot" : "text-adm-mut")}
                  >
                    <span className="relative">
                      <n.icon width={26} height={26} />
                      {n.key === "inbox" && <Badge n={unread} />}
                    </span>
                    {n.label}
                    {active && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-adm-apricot" />}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button type="button" onClick={() => setMoreOpen(true)} className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-[12px] font-semibold text-adm-mut">
                <MoreIcon width={26} height={26} />
                Mehr
              </button>
            </li>
          </ul>
        </nav>
      )}

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
    </ToastProvider>
  );
}
