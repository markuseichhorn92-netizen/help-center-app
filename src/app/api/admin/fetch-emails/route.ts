import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessEmails } from '@/lib/imap';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
