import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/dashboard/auth';
import { getPasswordHash, savePasswordHash } from '@/lib/dashboard/kv';

// POST /api/dashboard/password - Change password (requires auth)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = body.currentPassword as string;
    const newPassword = body.newPassword as string;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords required' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Neues Passwort zu kurz' }, { status: 400 });
    }

    // Verify current password
    const storedHash = await getPasswordHash();
    if (!storedHash) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 });
    }

    const valid = await verifyPassword(currentPassword, storedHash);
    if (!valid) {
      return NextResponse.json({ error: 'Aktuelles Passwort ist falsch' }, { status: 400 });
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await savePasswordHash(newHash);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Password change failed' }, { status: 500 });
  }
}
