import { NextRequest, NextResponse } from 'next/server';
import {
  getSpamTickets,
  restoreSpamTicket,
  deleteSpamTicket,
} from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

// GET: List all spam tickets
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const tickets = await getSpamTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get spam tickets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// POST: Restore ticket(s) from spam (mark as not spam)
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { ticketId, ticketIds } = body;

    // Single restore
    if (ticketId) {
      const ticket = await restoreSpamTicket(ticketId);
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket nicht gefunden oder kein Spam' },
          { status: 404 }
        );
      }
      return NextResponse.json({ ticket });
    }

    // Batch restore
    if (ticketIds && Array.isArray(ticketIds)) {
      const results = await Promise.all(
        ticketIds.map(async (id: string) => {
          try {
            const ticket = await restoreSpamTicket(id);
            return { id, success: ticket !== null };
          } catch {
            return { id, success: false };
          }
        })
      );

      return NextResponse.json({
        restored: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).map(r => r.id),
      });
    }

    return NextResponse.json(
      { error: 'ticketId oder ticketIds erforderlich' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Restore spam ticket error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete spam ticket(s)
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');
    const ticketIdsParam = searchParams.get('ticketIds');

    // Single delete
    if (ticketId) {
      const success = await deleteSpamTicket(ticketId);
      if (!success) {
        return NextResponse.json(
          { error: 'Ticket nicht gefunden' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Batch delete
    if (ticketIdsParam) {
      const ticketIds = ticketIdsParam.split(',');
      const results = await Promise.all(
        ticketIds.map(async (id) => {
          try {
            const success = await deleteSpamTicket(id);
            return { id, success };
          } catch {
            return { id, success: false };
          }
        })
      );

      return NextResponse.json({
        deleted: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).map(r => r.id),
      });
    }

    return NextResponse.json(
      { error: 'ticketId oder ticketIds erforderlich' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Delete spam ticket error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
