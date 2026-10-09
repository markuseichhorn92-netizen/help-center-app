// Gemeinsame Ticket-Aktionen für Liste und Detailansicht (gleiche Endpunkte wie bisher).
import type { TicketStatus } from "@/lib/admin/inbox";

export async function putTicket<T = unknown>(id: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/admin/tickets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sitzung abgelaufen");
  }
  if (!res.ok) throw new Error("Aktion fehlgeschlagen");
  return res.json();
}

/** „Erledigt“ = Status „Gelöst“ (ohne Bewertungsmail; „Geschlossen“ bleibt eine bewusste Aktion) */
export const DONE_STATUS: TicketStatus = "resolved";

export const setStatus = (id: string, status: TicketStatus) => putTicket(id, { status });
export const snoozeTicket = (id: string, until: Date | null) => putTicket(id, { snoozedUntil: until ? until.toISOString() : null });
