"use client";

import Link from "next/link";
import { memo } from "react";
import { Avatar, ChannelLabel, Pill, StatusPill, WaitBadge, cx } from "../ui/Pills";
import { CheckIcon, ClockIcon } from "../ui/icons";
import SwipeRow from "../ui/SwipeRow";
import { isActive, isSnoozed, type InboxTicket, type TicketPreview } from "@/lib/admin/inbox";

function InboxRowBase({
  ticket,
  preview,
  current,
  selectMode,
  checked,
  onToggle,
  onDone,
  onLater,
}: {
  ticket: InboxTicket;
  preview?: TicketPreview;
  current: boolean;
  selectMode: boolean;
  checked: boolean;
  onToggle: () => void;
  onDone: () => void;
  onLater: () => void;
}) {
  const unread = (ticket.unreadCount || 0) > 0;
  const active = isActive(ticket);
  const snoozed = isSnoozed(ticket);
  const waitingSince = active ? preview?.waitingSince ?? (unread ? ticket.updatedAt : null) : null;
  const text = preview?.text;

  const body = (
    <div className={cx("group relative flex items-start gap-3 px-4 py-3.5", current ? "bg-adm-surface-2" : "bg-adm-surface hover:bg-adm-surface-2/60")}>
      {selectMode ? (
        <label className="-m-2 flex h-14 w-14 shrink-0 items-center justify-center">
          <input type="checkbox" checked={checked} onChange={onToggle} className="h-6 w-6 accent-[var(--adm-teal)]" aria-label={`${ticket.customerName}: ${ticket.subject} auswählen`} />
        </label>
      ) : (
        <div className="relative">
          <Avatar name={ticket.customerName} />
          {unread && <span aria-hidden="true" className="absolute -left-1 top-0 h-3 w-3 rounded-full bg-adm-apricot ring-2 ring-adm-surface" />}
        </div>
      )}
      <Link
        href={`/admin/tickets/${ticket.id}`}
        aria-current={current ? "page" : undefined}
        className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
        onClick={(e) => selectMode && (e.preventDefault(), onToggle())}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className={cx("truncate text-[15px]", unread ? "font-extrabold text-adm-ink" : "font-semibold text-adm-ink")}>
            {ticket.customerName}
            {unread && <span className="sr-only"> ({ticket.unreadCount} ungelesen)</span>}
          </span>
          {waitingSince ? (
            <WaitBadge since={waitingSince} />
          ) : (
            <span className="adm-mono shrink-0 text-xs text-adm-mut">
              {new Date(ticket.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </span>
        <span className={cx("block truncate text-[15px]", unread ? "font-bold" : "font-medium")}>{ticket.subject}</span>
        <span className="block truncate text-sm text-adm-mut">
          {preview?.sender === "admin" && <span className="font-semibold">Du: </span>}
          {text || " "}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ChannelLabel channel={ticket.channel} />
          <StatusPill status={ticket.status} unread={unread} snoozed={snoozed} />
          {ticket.aiStatus === "escalated" && active && <Pill tone="danger">Mitarbeiter gewünscht</Pill>}
          {ticket.aiStatus === "active" && active && <Pill tone="wait">KI bearbeitet</Pill>}
          {ticket.category === "sonstiges" && <Pill tone="mut">Sonstiges</Pill>}
          {ticket.important && ticket.category !== "sonstiges" && <Pill tone="work">Wichtig/Intern</Pill>}
          <span className="adm-mono ml-auto text-xs text-adm-mut">{ticket.ticketNumber}</span>
        </span>
      </Link>

      {/* Maus/Tastatur: dieselben Aktionen wie das Wischen */}
      {!selectMode && active && (
        <div className="relative z-10 hidden shrink-0 flex-col gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 lg:flex">
          <button type="button" onClick={onDone} aria-label={`${ticket.customerName}: Erledigt`} title="Erledigt" className="flex h-10 w-10 items-center justify-center rounded-full bg-adm-ok-bg text-adm-ok-ink">
            <CheckIcon />
          </button>
          <button type="button" onClick={onLater} aria-label={`${ticket.customerName}: Später`} title="Später" className="flex h-10 w-10 items-center justify-center rounded-full bg-adm-wait-bg text-adm-wait-ink">
            <ClockIcon />
          </button>
        </div>
      )}
    </div>
  );

  if (selectMode || !active) return <li className="border-b border-adm-line">{body}</li>;
  return (
    <li className="border-b border-adm-line">
      <SwipeRow onDone={onDone} onLater={onLater}>
        {body}
      </SwipeRow>
    </li>
  );
}

export default memo(InboxRowBase);
