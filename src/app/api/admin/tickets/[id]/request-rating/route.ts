import { NextRequest, NextResponse } from 'next/server';
import { getTicket } from '@/lib/tickets';
import { createRatingToken, hasTicketRating } from '@/lib/ticket-rating';
import { sendRatingRequestEmail } from '@/lib/resend';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id: ticketId } = await params;

    // Get ticket
    const ticket = await getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Check if ticket already has a rating
    const alreadyRated = await hasTicketRating(ticketId);
    if (alreadyRated) {
      return NextResponse.json({ error: 'Ticket wurde bereits bewertet' }, { status: 400 });
    }

    // Create rating token
    const tokenData = await createRatingToken(ticketId);

    // Send rating request email
    const emailSent = await sendRatingRequestEmail({
      customerEmail: ticket.customerEmail,
      customerName: ticket.customerName,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      ratingToken: tokenData.token,
    });

    if (!emailSent) {
      return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bewertungsanfrage gesendet',
    });
  } catch (error) {
    console.error('Request rating error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
