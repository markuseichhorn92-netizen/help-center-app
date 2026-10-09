import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_S,
  createSessionToken,
  getAdminCredentials,
  verifyCredentials,
} from '@/lib/admin-auth';

const MAX_ATTEMPTS = 8;
const WINDOW_S = 15 * 60;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}

// Zählt Fehlversuche je IP in KV. Fällt KV aus, wird der Login nicht blockiert
// (sonst könnte ein KV-Ausfall den Inhaber aussperren).
async function attemptsSoFar(ip: string): Promise<number> {
  try {
    return Number((await kv.get<number>(`ratelimit:admin-login:${ip}`)) || 0);
  } catch {
    return 0;
  }
}

async function registerFailure(ip: string): Promise<void> {
  try {
    const key = `ratelimit:admin-login:${ip}`;
    const n = await kv.incr(key);
    if (n === 1) await kv.expire(key, WINDOW_S);
  } catch {
    /* ignorieren */
  }
}

async function clearFailures(ip: string): Promise<void> {
  try {
    await kv.del(`ratelimit:admin-login:${ip}`);
  } catch {
    /* ignorieren */
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!getAdminCredentials()) {
      // Kein Default-Passwort: ohne ADMIN_USER/ADMIN_PASS ist der Login gesperrt.
      return NextResponse.json(
        { success: false, error: 'Login ist nicht eingerichtet' },
        { status: 503 }
      );
    }

    const ip = clientIp(req);
    if ((await attemptsSoFar(ip)) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' },
        { status: 429, headers: { 'Retry-After': String(WINDOW_S) } }
      );
    }

    const { username, password } = await req.json();

    if (verifyCredentials(username, password)) {
      await clearFailures(ip);
      const token = await createSessionToken(String(username));
      const response = NextResponse.json({ success: true });
      response.cookies.set(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_S,
        path: '/',
      });
      return response;
    }

    await registerFailure(ip);
    return NextResponse.json(
      { success: false, error: 'Ungültige Anmeldedaten' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Anmeldung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
