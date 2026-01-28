import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/dashboard/auth';

// POST /api/dashboard/logout - Logout
export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
