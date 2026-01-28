import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createToken, setSessionCookie } from '@/lib/dashboard/auth';
import { getPasswordHash, getConfig } from '@/lib/dashboard/kv';

// POST /api/dashboard/login - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = body.password as string;

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    // Get stored password hash
    const storedHash = await getPasswordHash();
    if (!storedHash) {
      return NextResponse.json({ error: 'Setup not complete' }, { status: 400 });
    }

    // Verify password
    const valid = await verifyPassword(password, storedHash);
    if (!valid) {
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Get session timeout from config
    const config = await getConfig();
    const timeout = config.sessionTimeout || 86400;

    // Create JWT token
    const token = await createToken(timeout);

    // Set cookie
    await setSessionCookie(token, timeout);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
