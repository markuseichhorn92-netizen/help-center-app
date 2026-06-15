import { NextRequest, NextResponse } from 'next/server';
import { createTicket, createSpamTicket } from '@/lib/tickets';
import { ensureContactFromTicket } from '@/lib/contacts';
import { sendNewTicketNotification } from '@/lib/resend';
import { checkForSpam } from '@/lib/spam-protection';
import { publicTicketSchema, validateBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateBody(publicTicketSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }
    const { subject, customerName, customerEmail, content, priority, honeypot } = validation.data;

    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown';

    // Spam check
    const spamCheck = await checkForSpam({
      email: customerEmail,
      content,
      subject,
      ip,
      honeypotValue: honeypot,
    });

    if (spamCheck.isSpam) {
      // Store spam ticket for admin review instead of rejecting
      await createSpamTicket({
        subject,
        customerName,
        customerEmail,
        content,
        priority: priority || 'low',
        channel: 'web',
        spamReason: spamCheck.reason || 'Spam erkannt',
      });

      // Return generic error to not reveal spam detection
      return NextResponse.json(
        { message: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      );
    }

    const { ticket } = await createTicket({
      subject,
      customerName,
      customerEmail,
      content,
      priority: priority || 'medium',
    });

    // Ensure contact exists
    await ensureContactFromTicket({
      name: customerName,
      email: customerEmail,
    });

    // Notify admin about new ticket
    try {
      await sendNewTicketNotification({
        ticketNumber: ticket.ticketNumber,
        customerName,
        customerEmail,
        subject,
        channel: 'web',
        isEscalation: false,
      });
    } catch (notifyError) {
      console.error('Failed to send admin notification:', notifyError);
    }

    return NextResponse.json(
      {
        message: 'Ticket erfolgreich erstellt.',
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      { message: 'Fehler beim Erstellen des Tickets.' },
      { status: 500 }
    );
  }
}
