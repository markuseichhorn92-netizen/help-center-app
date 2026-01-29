import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/tickets';
import { ensureContactFromTicket } from '@/lib/contacts';
import { sendNewTicketNotification } from '@/lib/resend';
import { checkForSpam } from '@/lib/spam-protection';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, customerName, customerEmail, content, priority, honeypot } = body;

    // Validation
    if (!subject || !customerName || !customerEmail || !content) {
      return NextResponse.json(
        { message: 'Alle Pflichtfelder müssen ausgefüllt werden.' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { message: 'Bitte geben Sie eine gültige E-Mail-Adresse an.' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { message: spamCheck.reason || 'Anfrage wurde als Spam erkannt.' },
        { status: 429 }
      );
    }

    const { ticket, message } = await createTicket({
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
