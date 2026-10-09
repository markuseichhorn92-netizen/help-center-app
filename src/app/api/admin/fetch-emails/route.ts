import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessEmails } from '@/lib/imap';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const result = await fetchAndProcessEmails();

    return NextResponse.json({
      success: result.errors.length === 0,
      processed: result.processed,
      errors: result.errors,
      debug: result.debug,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Admin fetch-emails error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
