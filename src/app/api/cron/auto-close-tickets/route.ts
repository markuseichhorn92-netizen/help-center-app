import { NextRequest, NextResponse } from 'next/server';
import { autoCloseResolvedTickets, getTicketsToAutoClose } from '@/lib/tickets';
import { trashOldSonstiges } from '@/lib/mail-backfill';

// Cron job to auto-close resolved tickets after 1 hour
// Called by Vercel Cron or external scheduler
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Optional und standardmäßig AUS: Sonstiges älter als N Tage in den Papierkorb (nur wenn SONSTIGES_RETENTION_DAYS gesetzt)
    const retentionDays = Number(process.env.SONSTIGES_RETENTION_DAYS) || 0;
    if (retentionDays > 0) {
      const r = await trashOldSonstiges(retentionDays);
      if (r.trashed > 0) console.log(`Sonstiges in Papierkorb verschoben: ${r.trashed}`);
    }

    // Get tickets that will be closed (for logging)
    const ticketsToClose = await getTicketsToAutoClose();

    if (ticketsToClose.length === 0) {
      return NextResponse.json({
        message: 'Keine Tickets zum Schließen.',
        closed: 0,
      });
    }

    console.log(`Auto-closing ${ticketsToClose.length} resolved tickets:`,
      ticketsToClose.map(t => t.ticketNumber).join(', '));

    // Auto-close the tickets
    const result = await autoCloseResolvedTickets();

    return NextResponse.json({
      message: `${result.closed} Ticket(s) automatisch geschlossen.`,
      closed: result.closed,
      failed: result.failed,
      closedTickets: ticketsToClose.map(t => ({
        ticketNumber: t.ticketNumber,
        resolvedAt: t.resolvedAt,
      })),
    });
  } catch (error) {
    console.error('Auto-close cron job failed:', error);
    return NextResponse.json(
      { error: 'Fehler beim automatischen Schließen.' },
      { status: 500 }
    );
  }
}
