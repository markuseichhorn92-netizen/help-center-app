import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicket, updateTicketTags, moveTicketToTrash, permanentlyDeleteTicket } from '@/lib/tickets';
import { createRatingToken, hasTicketRating } from '@/lib/ticket-rating';
import { sendRatingRequestEmail } from '@/lib/resend';

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

    // Get current ticket state before update
    const currentTicket = await getTicket(id);
    if (!currentTicket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    // Handle tags separately if provided
    if (tags !== undefined && Array.isArray(tags)) {
      await updateTicketTags(id, tags);
    }

    const updatedTicket = await updateTicket(id, { status, priority, assignedTo });

    if (!updatedTicket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    // Auto-send rating request when ticket is closed (from any other status)
    if (status === 'closed' && currentTicket.status !== 'closed') {
      try {
        // Check if rating already exists
        const hasRating = await hasTicketRating(id);
        if (!hasRating) {
          // Create rating token and send email
          const tokenData = await createRatingToken(id);
          await sendRatingRequestEmail({
            customerEmail: currentTicket.customerEmail,
            customerName: currentTicket.customerName,
            ticketNumber: currentTicket.ticketNumber,
            subject: currentTicket.subject,
            ratingToken: tokenData.token,
          });
          console.log(`Auto-sent rating request for ticket ${currentTicket.ticketNumber}`);
        }
      } catch (ratingError) {
        // Log but don't fail the status update
        console.error('Failed to send rating request:', ratingError);
      }
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Aktualisieren des Tickets.' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { customerEmail, customerName, phone } = body;

    // Update allowed customer fields
    const updateData: Record<string, any> = {};
    if (customerEmail) updateData.customerEmail = customerEmail.toLowerCase().trim();
    if (customerName) updateData.customerName = customerName.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'Keine Änderungen angegeben.' }, { status: 400 });
    }

    const updatedTicket = await updateTicket(id, updateData);

    if (!updatedTicket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Failed to patch ticket:', error);
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
