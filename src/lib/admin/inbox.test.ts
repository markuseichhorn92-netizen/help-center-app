import { describe, expect, it } from 'vitest';
import {
  countFilters, formatWait, initials, isSnoozed, matchesFilter, previewText, snoozeOptions, sortInbox, waitSeverity,
  type InboxTicket,
} from './inbox';

const NOW = new Date('2026-10-09T10:00:00Z').getTime();
const t = (o: Partial<InboxTicket>): InboxTicket => ({
  id: 'x', ticketNumber: 'TKT-1', subject: 'Betreff', status: 'open', customerName: 'Anna Beispiel',
  customerEmail: 'anna@beispiel.de', createdAt: '2026-10-09T08:00:00Z', updatedAt: '2026-10-09T08:00:00Z', ...o,
});

describe('Filter', () => {
  it('Alle zeigt aktive, aber nicht Sonstiges/erledigte', () => {
    expect(matchesFilter(t({}), 'all', NOW)).toBe(true);
    expect(matchesFilter(t({ status: 'closed' }), 'all', NOW)).toBe(false);
    expect(matchesFilter(t({ category: 'sonstiges' }), 'all', NOW)).toBe(false);
    expect(matchesFilter(t({ category: 'sonstiges' }), 'other', NOW)).toBe(true);
  });
  it('Neu = aktiv + ungelesen', () => {
    expect(matchesFilter(t({ unreadCount: 2 }), 'unread', NOW)).toBe(true);
    expect(matchesFilter(t({ unreadCount: 0 }), 'unread', NOW)).toBe(false);
    expect(matchesFilter(t({ unreadCount: 2, status: 'resolved' }), 'unread', NOW)).toBe(false);
  });
  it('Offen schließt KI-bearbeitete aus (wie bisher)', () => {
    expect(matchesFilter(t({ aiStatus: 'active' }), 'open', NOW)).toBe(false);
    expect(matchesFilter(t({ aiStatus: 'active' }), 'ai_handling', NOW)).toBe(true);
    expect(matchesFilter(t({ aiStatus: 'escalated' }), 'escalated', NOW)).toBe(true);
  });
  it('Zähler', () => {
    const c = countFilters([t({ unreadCount: 1 }), t({ status: 'in_progress' }), t({ category: 'sonstiges' })], NOW);
    expect(c.all).toBe(2);
    expect(c.unread).toBe(1);
    expect(c.in_progress).toBe(1);
    expect(c.other).toBe(1);
  });
});

describe('Später', () => {
  const snoozed = t({ snoozedUntil: '2026-10-10T08:00:00Z', snoozedAt: '2026-10-09T08:00:00Z' });
  it('ist ausgeblendet bis zum Zeitpunkt', () => {
    expect(isSnoozed(snoozed, NOW)).toBe(true);
    expect(matchesFilter(snoozed, 'all', NOW)).toBe(false);
    expect(matchesFilter(snoozed, 'snoozed', NOW)).toBe(true);
    expect(isSnoozed(snoozed, new Date('2026-10-10T09:00:00Z').getTime())).toBe(false);
  });
  it('kommt zurück, wenn der Kunde neu schreibt', () => {
    expect(isSnoozed({ ...snoozed, updatedAt: '2026-10-09T09:30:00Z' }, NOW)).toBe(false);
  });
  it('Optionen enthalten Morgen früh und Montag', () => {
    const keys = snoozeOptions(new Date('2026-10-09T10:00:00')).map((o) => o.key);
    expect(keys).toEqual(['3h', 'evening', 'tomorrow', 'monday']);
  });
});

describe('Anzeige', () => {
  it('formatWait', () => {
    expect(formatWait('2026-10-09T09:48:00Z', NOW)).toBe('12 Min');
    expect(formatWait('2026-10-09T05:00:00Z', NOW)).toBe('5 Std');
    expect(formatWait('2026-10-08T10:00:00Z', NOW)).toBe('1 Tag');
    expect(formatWait('2026-10-06T10:00:00Z', NOW)).toBe('3 Tage');
    expect(formatWait('2026-09-01T10:00:00Z', NOW)).toBe('5 Wo');
  });
  it('waitSeverity', () => {
    expect(waitSeverity('2026-10-09T09:50:00Z', NOW)).toBe(0);
    expect(waitSeverity('2026-10-09T08:30:00Z', NOW)).toBe(1);
    expect(waitSeverity('2026-10-09T05:00:00Z', NOW)).toBe(2);
  });
  it('initials & previewText', () => {
    expect(initials('Anna Beispiel')).toBe('AB');
    expect(initials('support')).toBe('SU');
    expect(previewText('<p>Hallo&nbsp;Welt &amp; <b>Co</b></p><br>Zeile 2')).toBe('Hallo Welt & Co Zeile 2');
    expect(previewText('a'.repeat(200), 20)).toHaveLength(20);
    expect(previewText(null)).toBe('');
  });
  it('sortInbox: neueste zuerst, bei Neu nach Ungelesenen', () => {
    const a = t({ id: 'a', updatedAt: '2026-10-09T09:00:00Z', unreadCount: 1 });
    const b = t({ id: 'b', updatedAt: '2026-10-09T08:00:00Z', unreadCount: 3 });
    expect(sortInbox([b, a], 'all').map((x) => x.id)).toEqual(['a', 'b']);
    expect(sortInbox([a, b], 'unread').map((x) => x.id)).toEqual(['b', 'a']);
  });
});
