import type { ReactNode } from "react";
import { initials, formatWait, waitSeverity, type TicketStatus } from "@/lib/admin/inbox";
import { ClockIcon, GlobeIcon, MailIcon, WhatsAppIcon } from "./icons";

export function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

type Tone = "new" | "work" | "wait" | "ok" | "mut" | "danger" | "apricot";
const TONES: Record<Tone, string> = {
  new: "bg-adm-new-bg text-adm-new-ink",
  work: "bg-adm-work-bg text-adm-work-ink",
  wait: "bg-adm-wait-bg text-adm-wait-ink",
  ok: "bg-adm-ok-bg text-adm-ok-ink",
  mut: "bg-adm-surface-2 text-adm-mut",
  danger: "bg-adm-danger-bg text-adm-danger-ink",
  apricot: "bg-adm-apricot text-adm-on-apricot",
};

export function Pill({ tone = "mut", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Status als Text + Farbe (nie nur Farbe) */
export function statusPill(status: TicketStatus, opts: { unread?: boolean; snoozed?: boolean } = {}): { tone: Tone; label: string } {
  if (opts.snoozed) return { tone: "wait", label: "Später" };
  if (status === "open") return opts.unread ? { tone: "new", label: "Neu" } : { tone: "new", label: "Offen" };
  if (status === "in_progress") return { tone: "work", label: "In Arbeit" };
  if (status === "resolved") return { tone: "ok", label: "Gelöst" };
  return { tone: "mut", label: "Geschlossen" };
}

export function StatusPill({ status, unread, snoozed }: { status: TicketStatus; unread?: boolean; snoozed?: boolean }) {
  const s = statusPill(status, { unread, snoozed });
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export const CHANNEL_LABEL = { email: "E-Mail", whatsapp: "WhatsApp", web: "Web" } as const;

export function ChannelLabel({ channel, className }: { channel?: "email" | "whatsapp" | "web"; className?: string }) {
  const c = channel || "email";
  const Icon = c === "whatsapp" ? WhatsAppIcon : c === "web" ? GlobeIcon : MailIcon;
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium text-adm-mut", className)}>
      <Icon width={15} height={15} />
      {CHANNEL_LABEL[c]}
    </span>
  );
}

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-adm-surface-2 font-bold text-adm-teal dark:text-adm-ink", className)}
    >
      {initials(name)}
    </span>
  );
}

/** „wartet seit 12 Min“ – Farbe je Dringlichkeit, Text immer vorhanden */
export function WaitBadge({ since, label = "wartet seit", compact }: { since: string; label?: string; compact?: boolean }) {
  const sev = waitSeverity(since);
  const text = formatWait(since);
  return (
    <span
      className={cx(
        "adm-mono inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium",
        sev === 2 ? "text-adm-danger-ink" : sev === 1 ? "text-adm-apricot-ink" : "text-adm-mut"
      )}
      title={`${label} ${text}`}
    >
      <ClockIcon width={13} height={13} />
      {!compact && <span className="sr-only">{label} </span>}
      {text}
    </span>
  );
}
