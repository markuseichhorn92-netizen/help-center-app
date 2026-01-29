import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldDeletedTickets, cleanupOldSpamTickets } from '@/lib/tickets';

// This cron job runs daily to clean up:
// 1. Deleted tickets older than 30 days
// 2. Spam tickets older than 30 days

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clean up deleted tickets (trash)
    const trashResult = await cleanupOldDeletedTickets();
    console.log(`[Cleanup] Deleted ${trashResult.deleted} old tickets from trash`);

    // Clean up spam tickets
    const spamResult = await cleanupOldSpamTickets();
    console.log(`[Cleanup] Deleted ${spamResult.deleted} old spam tickets`);

    return NextResponse.json({
      success: true,
      trash: {
        deleted: trashResult.deleted,
        failed: trashResult.failed.length,
      },
      spam: {
        deleted: spamResult.deleted,
        failed: spamResult.failed.length,
      },
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual trigger
export async function POST(req: NextRequest) {
  return GET(req);
}
