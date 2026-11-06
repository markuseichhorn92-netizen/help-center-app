import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Geschützter Schreibzugang für Lena (Assistent). Bearer-Schlüssel, geprüft gegen
// den SHA-256-Hash aus LENA_API_KEY_SHA256 (der Klartext-Schlüssel liegt nur bei Lena).
// Ohne Env-Variable ist die gesamte API gesperrt (503).

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60; // je Minute und Instanz, alle Aufrufer zusammen
const MAX_FAILS = 10; // falsche Schlüssel je IP und Minute
const hits: number[] = [];
const fails = new Map<string, number[]>();

function prune(list: number[], now: number) {
  while (list.length && now - list[0] > WINDOW_MS) list.shift();
}

export function resetLenaRateLimit() {
  hits.length = 0;
  fails.clear();
}

function sha256Hex(input: string): Buffer {
  return createHash('sha256').update(input, 'utf8').digest();
}

export function lenaKeyMatches(presented: string, expectedHashHex: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(expectedHashHex)) return false;
  const a = sha256Hex(presented);
  const b = Buffer.from(expectedHashHex.toLowerCase(), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unbekannt';
}

function tooMany(retryAfter = 60) {
  return NextResponse.json({ error: 'Zu viele Anfragen' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
}

// Gibt eine Fehlerantwort zurück, wenn der Zugriff abzulehnen ist, sonst null.
export function requireLena(req: NextRequest): NextResponse | null {
  const expected = process.env.LENA_API_KEY_SHA256;
  if (!expected) return NextResponse.json({ error: 'Lena-Zugang nicht eingerichtet' }, { status: 503 });

  const now = Date.now();
  prune(hits, now);
  if (hits.length >= MAX_REQUESTS) return tooMany();

  const ip = clientIp(req);
  const failList = fails.get(ip) ?? [];
  prune(failList, now);
  if (failList.length >= MAX_FAILS) return tooMany();

  const header = req.headers.get('authorization') ?? '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  const ok = !!m && lenaKeyMatches(m[1].trim(), expected);
  if (!ok) {
    failList.push(now);
    fails.set(ip, failList);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  hits.push(now);
  return null;
}
