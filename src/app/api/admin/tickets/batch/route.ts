import { NextRequest, NextResponse } from 'next/server';
import { deleteTickets, updateTicketsStatus } from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

// Batch status update
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Keine Ticket-IDs angegeben.' },
        { status: 400 }
      );
    }

    if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { message: 'Ungültiger Status.' },
        { status: 400 }
      );
    }

    const result = await updateTicketsStatus(ids, status);

    return NextResponse.json({
      message: `${result.updated} Ticket(s) aktualisiert.`,
      updatedCount: result.updated,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Failed to update tickets:', error);
    return NextResponse.json(
      { message: 'Fehler beim Aktualisieren der Tickets.' },
      { status: 500 }
    );
  }
}

// Batch delete
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Keine Ticket-IDs angegeben.' },
        { status: 400 }
      );
    }

    const result = await deleteTickets(ids);

    return NextResponse.json({
      message: `${result.deleted} Ticket(s) gelöscht.`,
      deletedCount: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Failed to delete tickets:', error);
    return NextResponse.json(
      { message: 'Fehler beim Löschen der Tickets.' },
      { status: 500 }
    );
  }
}
