import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'adminpass';

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      // Create a cryptographically secure session token
      const sessionToken = randomBytes(32).toString('hex');

      const response = NextResponse.json({ success: true });

      // Set HTTP-only cookie for security
      response.cookies.set('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Ungültige Anmeldedaten' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Anmeldung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
