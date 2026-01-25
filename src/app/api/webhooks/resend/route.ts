import { NextRequest, NextResponse } from 'next/server';
import { createTicket, createMessage, findTicketByNumber, getTicket } from '@/lib/tickets';
import { parseTicketNumberFromSubject, sendTicketConfirmation } from '@/lib/resend';

// Resend Inbound Email Webhook
// Documentation: https://resend.com/docs/dashboard/webhooks/introduction

interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: ResendInboundEmail;
}

// Extract name and email from "Name <email@example.com>" format
function parseEmailAddress(fromString: string): { name: string; email: string } {
  const match = fromString.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || match[2].split('@')[0],
      email: match[2].trim().toLowerCase(),
    };
  }
  return { name: fromString, email: fromString };
}

export async function POST(req: NextRequest) {
  try {
    const payload: ResendWebhookPayload = await req.json();

    // Only process inbound emails
    if (payload.type !== 'email.received') {
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 });
    }

    const email = payload.data;
    const { name: senderName, email: senderEmail } = parseEmailAddress(email.from);
    const content = email.text || email.html?.replace(/<[^>]*>/g, '') || '';

    if (!content.trim()) {
      return NextResponse.json({ message: 'Empty email body' }, { status: 200 });
    }

    // Try to find existing ticket by ticket number in subject
    const ticketNumber = parseTicketNumberFromSubject(email.subject);

    if (ticketNumber) {
      // This is a reply to an existing ticket
      const existingTicket = await findTicketByNumber(ticketNumber);

      if (existingTicket) {
        // Add message to existing ticket
        await createMessage({
          ticketId: existingTicket.id,
          content: content.trim(),
          sender: 'customer',
          senderName,
          senderEmail,
          emailMessageId: email.headers?.['message-id'],
        });

        console.log(`Added reply to ticket ${ticketNumber}`);
        return NextResponse.json({
          message: 'Reply added to ticket',
          ticketNumber
        }, { status: 200 });
      }
    }

    // Create new ticket from email
    const subject = email.subject
      .replace(/^(Re:|Fwd:|Fw:|Aw:)\s*/gi, '') // Remove reply/forward prefixes
      .replace(/\[TKT-\d+\]\s*/gi, '') // Remove any ticket numbers
      .trim() || 'Neue Anfrage per E-Mail';

    const { ticket, message } = await createTicket({
      subject,
      customerName: senderName,
      customerEmail: senderEmail,
      content: content.trim(),
      priority: 'medium',
    });

    // Send confirmation email
    await sendTicketConfirmation(
      senderEmail,
      senderName,
      ticket.ticketNumber,
      subject
    );

    console.log(`Created new ticket ${ticket.ticketNumber} from email`);
    return NextResponse.json({
      message: 'Ticket created',
      ticketNumber: ticket.ticketNumber,
    }, { status: 201 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ message: 'Webhook processing failed' }, { status: 500 });
  }
}

// Verify webhook (GET endpoint for testing)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Resend webhook endpoint is active'
  });
}
