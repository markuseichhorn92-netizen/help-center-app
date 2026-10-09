import { NextRequest, NextResponse } from 'next/server';
import {
  getDeletedTickets,
  restoreTicketFromTrash,
  permanentlyDeleteTicket,
  moveTicketsToTrash,
} from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

// GET: List all deleted tickets
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const tickets = await getDeletedTickets();
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get deleted tickets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// POST: Restore ticket(s) from trash
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { ticketId, ticketIds } = body;

    // Single restore
    if (ticketId) {
      const ticket = await restoreTicketFromTrash(ticketId);
      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket nicht gefunden oder nicht im Papierkorb' },
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
            const ticket = await restoreTicketFromTrash(id);
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
    console.error('Restore ticket error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete ticket(s)
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');
    const ticketIdsParam = searchParams.get('ticketIds');

    // Single delete
    if (ticketId) {
      const success = await permanentlyDeleteTicket(ticketId);
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
            const success = await permanentlyDeleteTicket(id);
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
    console.error('Permanent delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// PATCH: Move tickets to trash (soft delete)
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { ticketIds } = body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json(
        { error: 'ticketIds Array erforderlich' },
        { status: 400 }
      );
    }

    const result = await moveTicketsToTrash(ticketIds);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Move to trash error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
