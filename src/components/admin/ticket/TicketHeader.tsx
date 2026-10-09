"use client";

import Link from "next/link";
import { Avatar, ChannelLabel, Pill, StatusPill, WaitBadge, cx } from "../ui/Pills";
import { ArrowDownIcon, ArrowUpIcon, BackIcon, CheckIcon, ClockIcon, MoreIcon, UserIcon, GridIcon } from "../ui/icons";
import { isSnoozed } from "@/lib/admin/inbox";
import type { Ticket } from "./types";

export default function TicketHeader({
  ticket,
  waitingSince,
  onDone,
  onLater,
  onMore,
  onDetails,
  prevId,
  nextId,
  goTo,
}: {
  ticket: Ticket;
  waitingSince: string | null;
  onDone: () => void;
  onLater: () => void;
  onMore: () => void;
  onDetails: () => void;
  prevId: string | null;
  nextId: string | null;
  goTo: (id: string) => void;
}) {
  const active = ticket.status !== "closed" && ticket.status !== "resolved";
  const snoozed = isSnoozed(ticket as never);
  const roundBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full";

  return (
    <header className="shrink-0 bg-adm-teal px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] text-adm-on-teal lg:border-b lg:border-adm-line lg:bg-adm-surface lg:px-6 lg:py-3 lg:text-adm-ink">
      <div className="flex items-center gap-2">
        <Link href="/admin/tickets" aria-label="Zurück zum Posteingang" className={cx(roundBtn, "hover:bg-white/10 lg:hidden")}>
          <BackIcon />
        </Link>
        <span className="hidden lg:block"><Avatar name={ticket.customerName} size={44} /></span>
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 text-lg font-extrabold leading-snug lg:text-xl">{ticket.subject}</h1>
          <p className="adm-mono truncate text-xs opacity-80">
            {ticket.ticketNumber} · {ticket.customerName}
          </p>
        </div>
        <div className="flex items-center">
          <button type="button" disabled={!prevId} onClick={() => prevId && goTo(prevId)} aria-label="Vorherige Anfrage" className={cx(roundBtn, "hidden hover:bg-white/10 disabled:opacity-30 sm:flex lg:hover:bg-adm-surface-2")}><ArrowUpIcon /></button>
          <button type="button" disabled={!nextId} onClick={() => nextId && goTo(nextId)} aria-label="Nächste Anfrage" className={cx(roundBtn, "hidden hover:bg-white/10 disabled:opacity-30 sm:flex lg:hover:bg-adm-surface-2")}><ArrowDownIcon /></button>
          <button type="button" onClick={onDetails} aria-label="Kunde und Details" title="Kunde und Details" className={cx(roundBtn, "hover:bg-white/10 lg:hover:bg-adm-surface-2 xl:hidden")}><GridIcon /></button>
          <button type="button" onClick={onMore} aria-label="Weitere Aktionen" className={cx(roundBtn, "hover:bg-white/10 lg:hover:bg-adm-surface-2")}><MoreIcon /></button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 lg:pl-14">
        <StatusPill status={ticket.status} unread={false} snoozed={snoozed} />
        <ChannelLabel channel={ticket.channel} className="text-inherit opacity-90" />
        {ticket.channel === "email" && ticket.category === "sonstiges" && <Pill tone="mut">Sonstiges</Pill>}
        {ticket.channel === "email" && ticket.category !== "sonstiges" && <Pill tone="ok">Kundenanfrage{ticket.important ? " · Wichtig/Intern" : ""}</Pill>}
        {ticket.assignedTo && <Pill tone="work"><UserIcon width={14} height={14} />{ticket.assignedTo}</Pill>}
        {active && waitingSince && (
          <span className="rounded-full bg-white/90 px-2 text-adm-ink lg:bg-transparent lg:px-0"><WaitBadge since={waitingSince} /></span>
        )}
        {active && (
          <span className="ml-auto hidden gap-2 lg:flex">
            <button type="button" onClick={onLater} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-adm-wait-bg px-4 text-sm font-bold text-adm-wait-ink"><ClockIcon width={18} height={18} />Später</button>
            <button type="button" onClick={onDone} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-adm-ok-bg px-4 text-sm font-bold text-adm-ok-ink"><CheckIcon width={18} height={18} />Erledigt</button>
          </span>
        )}
      </div>
    </header>
  );
}
