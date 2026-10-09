"use client";

import Link from "next/link";
import { Dialog } from "./ui/Dialog";
import { cx } from "./ui/Pills";
import { BellIcon, BellOffIcon, ExternalIcon, LogoutIcon, MoonIcon, SunIcon, BoltIcon } from "./ui/icons";
import { MORE_NAV } from "./nav";
import { useAdminControls, useTheme } from "./useAdminControls";

export default function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useAdminControls();
  const { dark, toggle } = useTheme();
  const online = c.adminStatus === "online";

  const row = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-semibold text-adm-ink hover:bg-adm-surface-2";

  return (
    <Dialog open={open} onClose={onClose} title="Mehr">
      <div className="space-y-5">
        <div>
          <h3 className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-adm-mut">Bereiche</h3>
          <ul>
            {MORE_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={onClose} className={row}>
                  <n.icon className="text-adm-teal dark:text-adm-apricot" />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-adm-mut">Einstellungen</h3>
          <ul>
            <li>
              <button type="button" onClick={c.toggleStatus} disabled={c.statusLoading} role="switch" aria-checked={online} className={row}>
                <span className={cx("h-3 w-3 rounded-full", online ? "bg-green-500" : "bg-adm-mut")} aria-hidden="true" />
                <span className="flex-1">
                  Live-Chat: {c.statusLoading ? "…" : online ? "Online" : "Offline"}
                  <span className="block text-xs font-normal text-adm-mut">
                    {online ? "Kunden sehen dich als verfügbar" : "Kunden sehen dich als nicht verfügbar"}
                  </span>
                </span>
              </button>
            </li>
            {c.pushStatus !== "unsupported" && (
              <li>
                <button
                  type="button"
                  onClick={c.togglePush}
                  disabled={c.pushLoading || c.pushStatus === "denied"}
                  role="switch"
                  aria-checked={c.pushStatus === "enabled"}
                  className={row}
                >
                  {c.pushStatus === "enabled" ? <BellIcon className="text-adm-teal dark:text-adm-apricot" /> : <BellOffIcon className="text-adm-mut" />}
                  <span className="flex-1">
                    Push-Benachrichtigungen:{" "}
                    {c.pushStatus === "enabled" ? "An" : c.pushStatus === "denied" ? "Im Browser blockiert" : "Aus"}
                    <span className="block text-xs font-normal text-adm-mut">Hinweis bei neuen Anfragen auf diesem Gerät</span>
                  </span>
                </button>
              </li>
            )}
            <li>
              <button type="button" onClick={toggle} className={row} role="switch" aria-checked={dark}>
                {dark ? <MoonIcon className="text-adm-apricot" /> : <SunIcon className="text-adm-teal" />}
                <span className="flex-1">Dunkler Modus: {dark ? "An" : "Aus"}</span>
              </button>
            </li>
            <li>
              <Link href="/admin/debug-push" onClick={onClose} className={row}>
                <BoltIcon className="text-adm-mut" />
                Push-Diagnose
              </Link>
            </li>
            <li>
              <a href="/" target="_blank" rel="noopener noreferrer" className={row}>
                <ExternalIcon className="text-adm-mut" />
                Zur Website (neuer Tab)
              </a>
            </li>
            <li>
              <button type="button" onClick={c.logout} className={cx(row, "text-adm-danger-ink")}>
                <LogoutIcon />
                Abmelden
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Dialog>
  );
}
