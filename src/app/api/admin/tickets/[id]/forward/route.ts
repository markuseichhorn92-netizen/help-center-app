import { NextRequest, NextResponse } from 'next/server';
import { getTicket, getTicketMessages } from '@/lib/tickets';
import { sendForwardedMessage } from '@/lib/resend';
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
    const body = await req.json();
    const { messageId, toEmail, toName, note, replyToCustomer } = body;

    // Validate required fields
    if (!toEmail) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Get ticket
    const ticket = await getTicket(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Get messages
    const messages = await getTicketMessages(ticketId);

    // Find the specific message or use the latest customer message
    let messageToForward;
    if (messageId) {
      messageToForward = messages.find(m => m.id === messageId);
      if (!messageToForward) {
        return NextResponse.json({ error: 'Nachricht nicht gefunden' }, { status: 404 });
      }
    } else {
      // Get the latest message
      messageToForward = messages[messages.length - 1];
      if (!messageToForward) {
        return NextResponse.json({ error: 'Keine Nachrichten vorhanden' }, { status: 400 });
      }
    }

    // Send forwarded email
    const result = await sendForwardedMessage({
      toEmail,
      toName: toName || undefined,
      forwardingNote: note || undefined,
      replyToCustomer: replyToCustomer === true,
      originalMessage: {
        senderName: messageToForward.senderName,
        senderEmail: messageToForward.senderEmail,
        content: messageToForward.content,
        createdAt: messageToForward.createdAt,
        attachments: messageToForward.attachments,
      },
      ticketInfo: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Weiterleitung fehlgeschlagen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forward error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
