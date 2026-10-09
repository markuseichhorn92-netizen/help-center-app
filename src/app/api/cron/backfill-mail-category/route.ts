import { NextRequest, NextResponse } from 'next/server';
import { backfillMailCategories } from '@/lib/mail-backfill';

export const maxDuration = 300;

// Einmalige, idempotente Nachsortierung alter E-Mail-Tickets (kein Cron-Eintrag in vercel.json).
// ?dry=1 zählt nur. Ohne gesetztes CRON_SECRET ist die Route gesperrt.
export async function GET(req: NextRequest) {
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const dryRun = req.nextUrl.searchParams.get('dry') === '1';
    const limit = Number(req.nextUrl.searchParams.get('limit')) || undefined;
    const result = await backfillMailCategories({ dryRun, limit, deadline: Date.now() + 240_000 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Backfill mail category failed:', error);
    return NextResponse.json({ success: false, error: 'Nachsortierung fehlgeschlagen.' }, { status: 500 });
  }
}
