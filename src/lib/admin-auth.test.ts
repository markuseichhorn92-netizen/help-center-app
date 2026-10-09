import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkBasicAuth,
  createSessionToken,
  isAdminRequest,
  requireAdmin,
  verifyCredentials,
  verifySessionToken,
} from './admin-auth';

const ENV = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_USER = 'chef';
  process.env.ADMIN_PASS = 'geheim-test-pass';
  delete process.env.ADMIN_SESSION_SECRET;
});
afterEach(() => {
  process.env = { ...ENV };
});

describe('Admin-Login', () => {
  it('sperrt den Login ohne konfigurierte Zugangsdaten (kein Default-Passwort)', () => {
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASS;
    expect(verifyCredentials('admin', 'adminpass')).toBe(false);
    expect(verifyCredentials('', '')).toBe(false);
  });
  it('akzeptiert nur die richtigen Zugangsdaten', () => {
    expect(verifyCredentials('chef', 'geheim-test-pass')).toBe(true);
    expect(verifyCredentials('chef', 'falsch')).toBe(false);
    expect(verifyCredentials('admin', 'geheim-test-pass')).toBe(false);
    expect(verifyCredentials(undefined, undefined)).toBe(false);
  });
});

describe('Session', () => {
  it('gültiges Token wird erkannt', async () => {
    const t = await createSessionToken('chef');
    expect(await verifySessionToken(t)).toEqual({ sub: 'chef' });
  });
  it('zufälliges Cookie (alte Lücke) wird abgelehnt', async () => {
    expect(await verifySessionToken('a'.repeat(64))).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
  });
  it('manipuliertes Token wird abgelehnt', async () => {
    const t = await createSessionToken('chef');
    expect(await verifySessionToken(t.slice(0, -3) + 'abc')).toBeNull();
  });
  it('Passwortwechsel macht alte Sessions ungültig', async () => {
    const t = await createSessionToken('chef');
    process.env.ADMIN_PASS = 'neues-passwort-xyz';
    expect(await verifySessionToken(t)).toBeNull();
  });
  it('ohne Zugangsdaten gibt es keine Sessions', async () => {
    const t = await createSessionToken('chef');
    delete process.env.ADMIN_USER;
    delete process.env.ADMIN_PASS;
    expect(await verifySessionToken(t)).toBeNull();
  });
});

describe('requireAdmin', () => {
  it('401 mit Fantasie-Cookie, null mit echtem Token', async () => {
    const bad = new Request('http://x/api/admin/tickets', { headers: { cookie: 'admin_session=irgendwas' } });
    expect((await requireAdmin(bad))?.status).toBe(401);
    const t = await createSessionToken('chef');
    const ok = new Request('http://x/api/admin/tickets', { headers: { cookie: `foo=1; admin_session=${t}` } });
    expect(await requireAdmin(ok)).toBeNull();
    expect(await isAdminRequest(ok)).toBe(true);
  });
  it('Basic Auth funktioniert nur mit richtigen Daten', () => {
    const good = 'Basic ' + Buffer.from('chef:geheim-test-pass').toString('base64');
    const bad = 'Basic ' + Buffer.from('chef:nein').toString('base64');
    expect(checkBasicAuth(good)).toBe(true);
    expect(checkBasicAuth(bad)).toBe(false);
    expect(checkBasicAuth(null)).toBe(false);
  });
});
