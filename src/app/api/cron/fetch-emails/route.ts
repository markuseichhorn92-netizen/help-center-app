import { NextRequest, NextResponse } from 'next/server';
import { fetchAndProcessEmails } from '@/lib/imap';
import { backfillMailCategories } from '@/lib/mail-backfill';
import { kv } from '@/lib/kv';

export const maxDuration = 300;

// This endpoint can be called by a cron job (e.g., Vercel Cron, external service)
// Recommended: Every 2-5 minutes

export async function GET(req: NextRequest) {
  // Optional: Verify cron secret for security
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await fetchAndProcessEmails();

    // Einmalige Nachsortierung alter E-Mail-Tickets: läuft nach dem Abruf mit eigenem Zeitbudget, bis nichts mehr offen ist
    let backfill: Awaited<ReturnType<typeof backfillMailCategories>> | undefined;
    try {
      if (!(await kv.get('mail:backfill:done'))) {
        backfill = await backfillMailCategories({ deadline: Date.now() + 120_000 });
        console.log('[Backfill] Einordnung alter Mails:', JSON.stringify(backfill));
        if (!backfill.timedOut && backfill.remaining === 0) await kv.set('mail:backfill:done', new Date().toISOString());
      }
    } catch (e) {
      console.error('[Backfill] Fehler:', e);
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      ...(backfill && { backfill }),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cron fetch-emails error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// Also allow POST for webhooks/cron services that use POST
export async function POST(req: NextRequest) {
  return GET(req);
}
