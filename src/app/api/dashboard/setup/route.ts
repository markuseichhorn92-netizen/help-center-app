import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken, setSessionCookie } from '@/lib/dashboard/auth';
import { getPasswordHash, savePasswordHash, setSetupComplete, getConfig } from '@/lib/dashboard/kv';

// POST /api/dashboard/setup - Initial password setup
export async function POST(request: NextRequest) {
  try {
    // Check if already set up
    const existingHash = await getPasswordHash();
    if (existingHash) {
      return NextResponse.json({ error: 'Already configured' }, { status: 400 });
    }

    const body = await request.json();
    const password = body.password as string;

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password too short (min 4 characters)' }, { status: 400 });
    }

    // Hash and save password
    const hashedPassword = await hashPassword(password);
    await savePasswordHash(hashedPassword);
    await setSetupComplete();

    // Get session timeout from config
    const config = await getConfig();
    const timeout = config.sessionTimeout || 86400;

    // Create session
    const token = await createToken(timeout);
    await setSessionCookie(token, timeout);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during setup:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}

// GET /api/dashboard/setup - Check if setup is needed
export async function GET() {
  try {
    const existingHash = await getPasswordHash();
    return NextResponse.json({ setupNeeded: !existingHash });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json({ setupNeeded: true });
  }
}
