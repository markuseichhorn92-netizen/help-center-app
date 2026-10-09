import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, any>();
const sets = new Map<string, Set<string>>();

vi.mock('./kv', () => ({
  kv: {
    hgetall: async (k: string) => store.get(k) ?? null,
    hset: async (k: string, v: any) => { store.set(k, { ...(store.get(k) || {}), ...v }); },
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
  },
}));

import { backfillMailCategories, trashOldSonstiges } from './mail-backfill';

function addTicket(id: string, t: Record<string, any>, msgs: Array<Record<string, any>>) {
  store.set(`ticket:${id}`, { id, channel: 'email', status: 'open', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', ...t });
  (sets.get('tickets:ids') ?? sets.set('tickets:ids', new Set()).get('tickets:ids')!).add(id);
  const ids = new Set<string>();
  msgs.forEach((m, i) => { const mid = `${id}-m${i}`; store.set(`message:${mid}`, { id: mid, ticketId: id, createdAt: `2026-09-01T10:0${i}:00.000Z`, ...m }); ids.add(mid); });
  sets.set(`ticket:${id}:messages`, ids);
}

describe('backfillMailCategories', () => {
  beforeEach(() => { store.clear(); sets.clear(); });

  it('ordnet alte E-Mail-Tickets ein, idempotent und ohne updatedAt zu ändern', async () => {
    addTicket('a', { customerEmail: 'noreply@vercel.com', subject: 'Deployment failed' }, [{ sender: 'customer', content: 'build failed' }]);
    addTicket('b', { customerEmail: 'max@gmail.com', subject: 'Kündigung' }, [{ sender: 'customer', content: 'Ich möchte kündigen' }]);
    addTicket('c', { customerEmail: 'newsletter@shop.de', subject: 'Angebot' }, [{ sender: 'customer', content: 'x' }, { sender: 'admin', content: 'Antwort' }]);
    addTicket('d', { channel: 'whatsapp', customerEmail: 'w@x.de', subject: 'WA' }, [{ sender: 'customer', content: 'hi' }]);

    const dry = await backfillMailCategories({ dryRun: true });
    expect(dry.emailWithoutCategory).toBe(3);
    expect(store.get('ticket:a').category).toBeUndefined();

    const r = await backfillMailCategories();
    expect(r.sonstiges).toBe(1);
    expect(r.kundenanfrage).toBe(2);
    expect(r.keptBecauseAnswered).toBe(1);
    expect(store.get('ticket:a').category).toBe('sonstiges');
    expect(store.get('ticket:b').category).toBe('kundenanfrage');
    expect(store.get('ticket:c').category).toBe('kundenanfrage');
    expect(store.get('ticket:d').category).toBeUndefined();
    expect(store.get('ticket:a').updatedAt).toBe('2026-09-01T10:00:00.000Z');

    const again = await backfillMailCategories();
    expect(again.emailWithoutCategory).toBe(0);
  });
});

describe('trashOldSonstiges', () => {
  beforeEach(() => { store.clear(); sets.clear(); });

  it('tut nichts bei days=0 und zählt nur bei dryRun', async () => {
    addTicket('a', { customerEmail: 'n@x.de', subject: 's', category: 'sonstiges' }, []);
    expect(await trashOldSonstiges(0)).toEqual({ eligible: 0, trashed: 0 });
    expect(await trashOldSonstiges(30, { dryRun: true })).toEqual({ eligible: 1, trashed: 0 });
    expect(store.get('ticket:a').deletedAt).toBeUndefined();
    expect(await trashOldSonstiges(30)).toEqual({ eligible: 1, trashed: 1 });
    expect(store.get('ticket:a').deletedAt).toBeTruthy();
  });
});
