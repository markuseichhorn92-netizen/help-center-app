import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, any>();
const sets = new Map<string, Set<string>>();

vi.mock('./kv', () => ({
  kv: {
    hgetall: async (k: string) => store.get(k) ?? null,
    hset: async (k: string, v: any) => { store.set(k, { ...(store.get(k) || {}), ...v }); },
    hdel: async (k: string, ...fields: string[]) => {
      const cur = { ...(store.get(k) || {}) };
      fields.forEach((f) => delete cur[f]);
      store.set(k, cur);
    },
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
  },
}));

import { getTicketPreviews, setTicketSnooze } from './tickets';

function addTicket(id: string, msgs: Array<Record<string, any>>) {
  store.set(`ticket:${id}`, { id, status: 'open', createdAt: '2026-10-09T08:00:00.000Z', updatedAt: '2026-10-09T09:00:00.000Z' });
  const ids = new Set<string>();
  msgs.forEach((m, i) => {
    const mid = `${id}-m${i}`;
    store.set(`message:${mid}`, { id: mid, ticketId: id, createdAt: `2026-10-09T09:0${i}:00.000Z`, ...m });
    ids.add(mid);
  });
  sets.set(`ticket:${id}:messages`, ids);
}

describe('getTicketPreviews', () => {
  beforeEach(() => { store.clear(); sets.clear(); });

  it('liefert letzte Nachricht als Text und „wartet seit“ ab Beginn der unbeantworteten Kundenserie', async () => {
    addTicket('t1', [
      { sender: 'customer', content: '<p>Erste</p>' },
      { sender: 'admin', content: 'Antwort' },
      { sender: 'customer', content: '<p>Hallo&nbsp;<b>Team</b></p>' },
      { sender: 'customer', content: 'Noch eine Frage' },
    ]);
    addTicket('t2', [{ sender: 'customer', content: 'x' }, { sender: 'admin', content: 'Erledigt, danke' }]);
    const p = await getTicketPreviews(['t1', 't2', 'unbekannt']);
    expect(p.t1.sender).toBe('customer');
    expect(p.t1.text).toBe('Noch eine Frage');
    expect(p.t1.waitingSince).toBe('2026-10-09T09:02:00.000Z');
    expect(p.t2.sender).toBe('admin');
    expect(p.t2.waitingSince).toBeNull();
    expect(p.unbekannt).toBeUndefined();
  });
});

describe('setTicketSnooze', () => {
  beforeEach(() => { store.clear(); sets.clear(); });

  it('setzt und entfernt „Später“, ohne updatedAt zu ändern', async () => {
    addTicket('t1', []);
    const until = '2026-10-10T06:00:00.000Z';
    const t = await setTicketSnooze('t1', until);
    expect(t?.snoozedUntil).toBe(until);
    expect(store.get('ticket:t1').snoozedAt).toBe('2026-10-09T09:00:00.000Z');
    expect(store.get('ticket:t1').updatedAt).toBe('2026-10-09T09:00:00.000Z');

    const cleared = await setTicketSnooze('t1', null);
    expect(cleared?.snoozedUntil).toBeUndefined();
    expect(store.get('ticket:t1').snoozedUntil).toBeUndefined();
    expect(await setTicketSnooze('nope', until)).toBeNull();
  });
});
