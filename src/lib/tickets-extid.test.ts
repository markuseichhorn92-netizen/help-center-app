import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, any>();
const sets = new Map<string, Set<string>>();
let scanCalls = 0;

vi.mock('./kv', () => ({
  kv: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: any) => { store.set(k, v); return 'OK'; },
    hgetall: async (k: string) => store.get(k) ?? null,
    hmset: async (k: string, v: any) => { store.set(k, v); },
    hset: async (k: string, v: any) => { store.set(k, { ...(store.get(k) || {}), ...v }); },
    sadd: async (k: string, v: string) => { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(v); },
    smembers: async (k: string) => { scanCalls++; return [...(sets.get(k) ?? [])]; },
  },
}));

import { createMessage, findMessageByExternalId } from './tickets';

describe('findMessageByExternalId', () => {
  beforeEach(() => { store.clear(); sets.clear(); scanCalls = 0; });

  it('finds a new message via index without scanning tickets', async () => {
    const m = await createMessage({ ticketId: 't1', content: 'x', sender: 'customer', senderName: 'a', senderEmail: 'a@b.de', emailMessageId: '<abc@x>' });
    const found = await findMessageByExternalId('<abc@x>', 'email');
    expect(found?.id).toBe(m.id);
    expect(scanCalls).toBe(0);
  });

  it('falls back to scan for legacy messages and indexes them', async () => {
    sets.set('tickets:ids', new Set(['t1']));
    sets.set('ticket:t1:messages', new Set(['m1']));
    store.set('message:m1', { id: 'm1', emailMessageId: '<old@x>' });
    expect((await findMessageByExternalId('<old@x>', 'email'))?.id).toBe('m1');
    const before = scanCalls;
    expect((await findMessageByExternalId('<old@x>', 'email'))?.id).toBe('m1');
    expect(scanCalls).toBe(before);
  });

  it('returns null when nothing matches', async () => {
    expect(await findMessageByExternalId('<none@x>', 'email')).toBeNull();
  });
});
