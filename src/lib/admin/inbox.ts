// Reine Hilfsfunktionen für den Posteingang (Filter, Zähler, „wartet seit“, Vorschau-Text).
// Bewusst ohne React/KV, damit sie gut testbar sind.

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface InboxTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority?: 'low' | 'medium' | 'high';
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  unreadCount?: number;
  channel?: 'email' | 'whatsapp' | 'web';
  aiStatus?: 'active' | 'escalated' | 'disabled';
  category?: 'kundenanfrage' | 'sonstiges';
  categoryReason?: string;
  important?: boolean;
  snoozedUntil?: string;
  snoozedAt?: string;
}

export interface TicketPreview {
  sender: 'customer' | 'admin';
  createdAt: string;
  text: string;
  /** Zeitpunkt der letzten Kundennachricht, auf die noch keine Antwort folgte (sonst null) */
  waitingSince: string | null;
}

export type InboxFilter =
  | 'all'
  | 'unread'
  | 'escalated'
  | 'ai_handling'
  | 'open'
  | 'in_progress'
  | 'snoozed'
  | 'resolved'
  | 'closed'
  | 'other';

export const FILTER_LABELS: Record<InboxFilter, string> = {
  all: 'Alle',
  unread: 'Neu',
  escalated: 'Mitarbeiter',
  ai_handling: 'KI bearbeitet',
  open: 'Offen',
  in_progress: 'In Arbeit',
  snoozed: 'Später',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
  other: 'Sonstiges',
};

export const FILTER_ORDER: InboxFilter[] = [
  'all', 'unread', 'escalated', 'ai_handling', 'open', 'in_progress', 'snoozed', 'resolved', 'closed', 'other',
];

export function isActive(t: InboxTicket): boolean {
  return t.status !== 'closed' && t.status !== 'resolved';
}

/** „Später“: bis zum Zeitpunkt zurückgestellt – und seitdem keine neue Aktivität (z. B. Kundennachricht). */
export function isSnoozed(t: InboxTicket, now: number = Date.now()): boolean {
  if (!t.snoozedUntil) return false;
  const until = new Date(t.snoozedUntil).getTime();
  if (!Number.isFinite(until) || until <= now) return false;
  if (t.snoozedAt) {
    const at = new Date(t.snoozedAt).getTime();
    if (Number.isFinite(at) && new Date(t.updatedAt).getTime() > at + 1000) return false;
  }
  return isActive(t);
}

export function matchesSearch(t: InboxTicket, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.ticketNumber.toLowerCase().includes(q) ||
    t.subject.toLowerCase().includes(q) ||
    t.customerName.toLowerCase().includes(q) ||
    t.customerEmail.toLowerCase().includes(q)
  );
}

/** Gleiche Regeln wie bisher (Sonstiges nur im eigenen Filter), plus „Später“. */
export function matchesFilter(t: InboxTicket, filter: InboxFilter, now: number = Date.now()): boolean {
  if (filter === 'other') return t.category === 'sonstiges';
  if (t.category === 'sonstiges') return false;
  const snoozed = isSnoozed(t, now);
  switch (filter) {
    case 'snoozed':
      return snoozed;
    case 'unread':
      return isActive(t) && !snoozed && (t.unreadCount || 0) > 0;
    case 'escalated':
      return isActive(t) && t.aiStatus === 'escalated';
    case 'ai_handling':
      return isActive(t) && t.aiStatus === 'active';
    case 'all':
      return isActive(t) && !snoozed;
    case 'open':
      return t.status === 'open' && t.aiStatus !== 'active' && !snoozed;
    case 'in_progress':
      return t.status === 'in_progress' && !snoozed;
    case 'resolved':
      return t.status === 'resolved';
    case 'closed':
      return t.status === 'closed';
    default:
      return true;
  }
}

export function countFilters(tickets: InboxTicket[], now: number = Date.now()): Record<InboxFilter, number> {
  const out = {} as Record<InboxFilter, number>;
  for (const f of FILTER_ORDER) out[f] = 0;
  for (const t of tickets) {
    for (const f of FILTER_ORDER) if (matchesFilter(t, f, now)) out[f]++;
  }
  return out;
}

/** Ungelesene/älteste zuerst bei „Neu“, sonst zuletzt aktive zuerst. */
export function sortInbox(list: InboxTicket[], filter: InboxFilter): InboxTicket[] {
  const byUpdated = (a: InboxTicket, b: InboxTicket) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  return [...list].sort((a, b) => {
    if (filter === 'unread') {
      const d = (b.unreadCount || 0) - (a.unreadCount || 0);
      if (d !== 0) return d;
    }
    return byUpdated(a, b);
  });
}

/** „12 Min“, „5 Std“, „1 Tag“, „3 Tage“, „2 Wo“ */
export function formatWait(fromIso: string, now: number = Date.now()): string {
  const ms = Math.max(0, now - new Date(fromIso).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'jetzt';
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 14) return d === 1 ? '1 Tag' : `${d} Tage`;
  return `${Math.floor(d / 7)} Wo`;
}

/** Dringlichkeit der Wartezeit für die Farbe: 0 normal, 1 > 1 Std, 2 > 4 Std */
export function waitSeverity(fromIso: string, now: number = Date.now()): 0 | 1 | 2 {
  const h = (now - new Date(fromIso).getTime()) / 3600000;
  if (h >= 4) return 2;
  if (h >= 1) return 1;
  return 0;
}

export function initials(name: string): string {
  const parts = name.replace(/[<>"@]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&nbsp;': ' ',
  '&auml;': 'ä', '&ouml;': 'ö', '&uuml;': 'ü', '&Auml;': 'Ä', '&Ouml;': 'Ö', '&Uuml;': 'Ü', '&szlig;': 'ß',
};

/** HTML → einzeiliger Vorschautext */
export function previewText(html: string | null | undefined, max = 140): string {
  if (!html) return '';
  const text = String(html)
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

/** Zeitpunkt für „Später“-Optionen */
export function snoozeOptions(now: Date = new Date()): Array<{ key: string; label: string; until: Date }> {
  const inHours = (h: number) => new Date(now.getTime() + h * 3600000);
  const at = (daysAhead: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const opts = [{ key: '3h', label: 'In 3 Stunden', until: inHours(3) }];
  if (now.getHours() < 16) opts.push({ key: 'evening', label: 'Heute Abend (18 Uhr)', until: at(0, 18) });
  opts.push({ key: 'tomorrow', label: 'Morgen früh (8 Uhr)', until: at(1, 8) });
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  opts.push({ key: 'monday', label: 'Nächsten Montag (8 Uhr)', until: at(daysToMonday, 8) });
  return opts;
}
