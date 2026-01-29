import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicket, updateTicketTags, moveTicketToTrash, permanentlyDeleteTicket } from '@/lib/tickets';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to get ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Laden des Tickets.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, assignedTo, tags } = body;

    // Handle tags separately if provided
    if (tags !== undefined && Array.isArray(tags)) {
      await updateTicketTags(id, tags);
    }

    const updatedTicket = await updateTicket(id, { status, priority, assignedTo });

    if (!updatedTicket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Aktualisieren des Tickets.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      // Permanent delete (for trash cleanup)
      const deleted = await permanentlyDeleteTicket(id);
      if (!deleted) {
        return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Ticket endgültig gelöscht.' });
    } else {
      // Soft delete (move to trash)
      const ticket = await moveTicketToTrash(id);
      if (!ticket) {
        return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Ticket in Papierkorb verschoben.', ticket });
    }
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Löschen des Tickets.' }, { status: 500 });
  }
}
