import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
import { NextRequest } from 'next/server';

const store = new Map<string, Record<string, unknown>>();
const sets = new Map<string, Set<string>>();
const kvSets = new Map<string, unknown>();
const log: string[] = [];

vi.mock('@/lib/kv', () => ({
  kv: {
    smembers: async (k: string) => [...(sets.get(k) ?? [])],
    sadd: async (k: string, v: string) => { (sets.get(k) ?? sets.set(k, new Set()).get(k)!).add(v); },
    hgetall: async (k: string) => store.get(k) ?? null,
    hmset: async (k: string, v: Record<string, unknown>) => { store.set(k, { ...v }); },
    set: async (k: string, v: unknown) => { kvSets.set(k, v); },
    lpush: async (_k: string, v: string) => { log.unshift(v); },
    ltrim: async () => {},
  },
}));
const revalidate = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (...a: unknown[]) => revalidate(...a) }));

import { GET as listGet, POST as create } from '@/app/api/lena/articles/route';
import { GET as oneGet, PATCH as patch, DELETE as del } from '@/app/api/lena/articles/[id]/route';
import { GET as catGet } from '@/app/api/lena/categories/route';
import { resetLenaRateLimit } from '@/lib/lena/auth';

const KEY = 'test-schluessel-nur-fuer-tests';
const HASH = createHash('sha256').update(KEY).digest('hex');
const ID = '11111111-2222-3333-4444-555555555555';

const req = (method: string, url: string, opts: { key?: string | null; body?: unknown; ip?: string } = {}) =>
  new NextRequest('http://localhost' + url, {
    method,
    headers: {
      ...(opts.key === null ? {} : { authorization: `Bearer ${opts.key ?? KEY}` }),
      'x-forwarded-for': opts.ip ?? '1.1.1.1',
      'content-type': 'application/json',
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  store.clear(); sets.clear(); kvSets.clear(); log.length = 0; revalidate.mockClear();
  resetLenaRateLimit();
  process.env.LENA_API_KEY_SHA256 = HASH;
  store.set('category:cat1', { id: 'cat1', name: 'Studio', order: 1 });
  sets.set('categories:ids', new Set(['cat1']));
  store.set(`article:${ID}`, { id: ID, title: 'Alt', content: '<p>alt</p>', published: true, category: 'cat1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  sets.set('articles:ids', new Set([ID]));
});

describe('Auth', () => {
  it('ohne Env: 503', async () => {
    delete process.env.LENA_API_KEY_SHA256;
    expect((await listGet(req('GET', '/api/lena/articles'))).status).toBe(503);
  });
  it('ohne Schlüssel: 401', async () => {
    expect((await listGet(req('GET', '/api/lena/articles', { key: null }))).status).toBe(401);
  });
  it('falscher Schlüssel: 401, auf allen Routen', async () => {
    expect((await listGet(req('GET', '/api/lena/articles', { key: 'falsch' }))).status).toBe(401);
    expect((await oneGet(req('GET', '/x', { key: 'falsch' }), ctx())).status).toBe(401);
    expect((await create(req('POST', '/x', { key: 'falsch', body: { title: 'abc', content: 'x' } }))).status).toBe(401);
    expect((await patch(req('PATCH', '/x', { key: 'falsch', body: { title: 'abc' } }), ctx())).status).toBe(401);
    expect((await catGet(req('GET', '/x', { key: 'falsch' }))).status).toBe(401);
    expect(store.get(`article:${ID}`)?.title).toBe('Alt');
  });
  it('kaputter Hash in Env: alles abgelehnt', async () => {
    process.env.LENA_API_KEY_SHA256 = 'kaputt';
    expect((await listGet(req('GET', '/x'))).status).toBe(401);
  });
  it('richtiger Schlüssel: 200', async () => {
    expect((await listGet(req('GET', '/api/lena/articles'))).status).toBe(200);
    expect((await catGet(req('GET', '/api/lena/categories'))).status).toBe(200);
  });
  it('Rate-Limit: nach 10 falschen Schlüsseln 429, auch mit richtigem von derselben IP', async () => {
    for (let i = 0; i < 10; i++) await listGet(req('GET', '/x', { key: 'falsch', ip: '9.9.9.9' }));
    expect((await listGet(req('GET', '/x', { ip: '9.9.9.9' }))).status).toBe(429);
    expect((await listGet(req('GET', '/x', { ip: '8.8.8.8' }))).status).toBe(200);
  });
});

describe('Lesen', () => {
  it('Liste ohne Inhalt, mit Suche', async () => {
    const all = await (await listGet(req('GET', '/api/lena/articles'))).json();
    expect(all).toHaveLength(1);
    expect(all[0].content).toBeUndefined();
    expect(await (await listGet(req('GET', '/api/lena/articles?q=nix'))).json()).toHaveLength(0);
  });
  it('Einzelner Artikel / 404 / ungültige ID', async () => {
    expect((await (await oneGet(req('GET', '/x'), ctx())).json()).content).toBe('<p>alt</p>');
    expect((await oneGet(req('GET', '/x'), ctx('99999999-0000-0000-0000-000000000000'))).status).toBe(404);
    expect((await oneGet(req('GET', '/x'), ctx('../etc'))).status).toBe(400);
  });
});

describe('Schreiben', () => {
  it('Neu anlegen, Standard unveröffentlicht, Caches aktualisiert, Log', async () => {
    const res = await create(req('POST', '/x', { body: { title: 'Neuer Artikel', content: '<p>x</p>', category: 'cat1' } }));
    expect(res.status).toBe(201);
    const a = await res.json();
    expect(a.published).toBe(false);
    expect(sets.get('articles:ids')!.has(a.id)).toBe(true);
    expect(revalidate).toHaveBeenCalled();
    expect(log).toHaveLength(1);
  });
  it('Validierung: kurzer Titel, leerer Inhalt, fremde Felder, falscher Typ, unbekannte Kategorie', async () => {
    for (const body of [
      { title: 'ab', content: 'x' },
      { title: 'Titel', content: '' },
      { title: 'Titel', content: 'x', id: 'fremd' },
      { title: 'Titel', content: 'x', published: 'ja' },
    ]) expect((await create(req('POST', '/x', { body }))).status).toBe(400);
    expect((await create(req('POST', '/x', { body: { title: 'Titel', content: 'x', category: 'gibtsnicht' } }))).status).toBe(400);
    expect(sets.get('articles:ids')!.size).toBe(1);
  });
  it('Ändern sichert alte Fassung und schreibt Log', async () => {
    const res = await patch(req('PATCH', '/x', { body: { title: 'Neu' } }), ctx());
    expect(res.status).toBe(200);
    expect(store.get(`article:${ID}`)?.title).toBe('Neu');
    expect(store.get(`article:${ID}`)?.content).toBe('<p>alt</p>');
    const keys = [...kvSets.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(new RegExp(`^lena:backup:${ID}:`));
    expect((kvSets.get(keys[0]) as { title: string }).title).toBe('Alt');
    expect(log).toHaveLength(1);
  });
  it('Archivieren per published:false', async () => {
    await patch(req('PATCH', '/x', { body: { published: false } }), ctx());
    expect(store.get(`article:${ID}`)?.published).toBe(false);
  });
  it('Ändern: leer, fremde Felder, unbekannt → Fehler, nichts geschrieben', async () => {
    expect((await patch(req('PATCH', '/x', { body: {} }), ctx())).status).toBe(400);
    expect((await patch(req('PATCH', '/x', { body: { createdAt: 'x' } }), ctx())).status).toBe(400);
    expect((await patch(req('PATCH', '/x', { body: { title: 'Neu' } }), ctx('99999999-0000-0000-0000-000000000000'))).status).toBe(404);
    expect(kvSets.size).toBe(0);
  });
});

describe('Kein Löschen', () => {
  it('DELETE ist 405 und der Artikel bleibt', async () => {
    const res = await del();
    expect(res.status).toBe(405);
    expect(store.has(`article:${ID}`)).toBe(true);
  });
  it('kein delete/del im Lena-Code', async () => {
    const { execSync } = await import('child_process');
    const out = execSync(`grep -rnE "kv\\.(del|srem|flush)" src/app/api/lena src/lib/lena || true`, { encoding: 'utf8' });
    expect(out.trim()).toBe('');
  });
});
