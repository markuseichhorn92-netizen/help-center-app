import { NextRequest, NextResponse } from 'next/server';
import { createTicket } from '@/lib/tickets';
import { ensureContactFromTicket } from '@/lib/contacts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, customerName, customerEmail, content, priority } = body;

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
