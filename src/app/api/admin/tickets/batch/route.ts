import { NextRequest, NextResponse } from 'next/server';
import { deleteTickets } from '@/lib/tickets';

export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
