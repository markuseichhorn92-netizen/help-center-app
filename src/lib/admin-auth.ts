import { jwtVerify, SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'crypto';

// Signierte Admin-Session (JWT, HS256) mit Ablauf.
// Schlüssel: ADMIN_SESSION_SECRET (optional, empfohlen). Fehlt er, wird er aus
// ADMIN_USER + ADMIN_PASS abgeleitet – bestehende Zugangsdaten reichen also.
// Passwortwechsel macht alle laufenden Sitzungen ungültig.

export const ADMIN_COOKIE = 'admin_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 Tage
const ISSUER = 'fitinn-help-admin';

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

export function getAdminCredentials(): { user: string; pass: string } | null {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) return null;
  return { user, pass };
}

function getSecret(): Uint8Array | null {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length >= 16) return new Uint8Array(sha256(`session:${explicit}`));
  const creds = getAdminCredentials();
  if (!creds) return null; // keine Zugangsdaten → keine Sitzung möglich
  return new Uint8Array(sha256(`derived:${creds.user}:${creds.pass}`));
}

// Timing-sicherer Vergleich (Hash vorher, damit Längen gleich sind).
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export function verifyCredentials(username: unknown, password: unknown): boolean {
  const creds = getAdminCredentials();
  if (!creds) return false; // kein Default-Passwort: ohne Variablen ist der Login gesperrt
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  const userOk = safeEqual(username, creds.user);
  const passOk = safeEqual(password, creds.pass);
  return userOk && passOk;
}

export async function createSessionToken(username: string): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('Admin-Zugangsdaten nicht konfiguriert');
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ sub: string } | null> {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] });
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export function checkBasicAuth(header: string | null | undefined): boolean {
  const creds = getAdminCredentials();
  if (!creds || !header || !header.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const idx = decoded.indexOf(':');
    if (idx < 0) return false;
    return verifyCredentials(decoded.slice(0, idx), decoded.slice(idx + 1));
  } catch {
    return false;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Prüft Session-Cookie (oder Basic Auth für externe Werkzeuge). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const session = await verifySessionToken(readCookie(req.headers.get('cookie'), ADMIN_COOKIE));
  if (session) return true;
  return checkBasicAuth(req.headers.get('authorization'));
}

/** Zentrale Prüfung für Admin-API-Routen: null = erlaubt, sonst fertige 401-Antwort. */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (await isAdminRequest(req)) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
