"use client";

import { Dialog } from "../ui/Dialog";
import { ClockIcon } from "../ui/icons";
import { snoozeOptions } from "@/lib/admin/inbox";

/** „Später“: Ticket bis zu einem Zeitpunkt zurückstellen. Kommt früher zurück, wenn der Kunde neu schreibt. */
export default function SnoozeDialog({
  open,
  onClose,
  onPick,
  title = "Später erinnern",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (until: Date, label: string) => void;
  title?: string;
}) {
  const opts = open ? snoozeOptions() : [];
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-3 text-sm text-adm-mut">Die Anfrage verschwindet aus „Alle“ und kommt zur gewählten Zeit zurück – oder sofort, wenn der Kunde schreibt.</p>
      <ul className="space-y-2">
        {opts.map((o) => (
          <li key={o.key}>
            <button
              type="button"
              onClick={() => onPick(o.until, o.label)}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-adm-surface-2 px-4 text-left text-base font-bold text-adm-ink hover:brightness-95"
            >
              <ClockIcon className="text-adm-wait-ink" />
              <span className="flex-1">{o.label}</span>
              <span className="adm-mono text-xs font-medium text-adm-mut">
                {o.until.toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
