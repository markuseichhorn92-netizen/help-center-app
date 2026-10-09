"use client";

import { useSyncExternalStore } from "react";
import { countFilters, type InboxTicket } from "@/lib/admin/inbox";

// Kleiner gemeinsamer Speicher: Der Posteingang schreibt rein, Navigation (Zähler-Badge)
// und ⌘K-Palette (Ticketsuche) lesen. Kein zusätzlicher Netzwerkverkehr.
interface State {
  tickets: InboxTicket[];
  unread: number;
}

let state: State = { tickets: [], unread: 0 };
const listeners = new Set<() => void>();

export function publishTickets(tickets: InboxTicket[]) {
  state = { tickets, unread: countFilters(tickets).unread };
  try {
    sessionStorage.setItem("adm:unread", String(state.unread));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useInboxTickets(): InboxTicket[] {
  return useSyncExternalStore(subscribe, () => state.tickets, () => state.tickets);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (state.tickets.length > 0) return state.unread;
      try {
        return Number(sessionStorage.getItem("adm:unread") || 0);
      } catch {
        return 0;
      }
    },
    () => 0
  );
}

/** Ticket-Aktionen aus der ⌘K-Palette an die geöffnete Ticket-Ansicht schicken */
export type TicketAction = "done" | "later" | "lena" | "reply";
export function fireTicketAction(action: TicketAction) {
  window.dispatchEvent(new CustomEvent("adm:ticket-action", { detail: { action } }));
}
