import { NextRequest, NextResponse } from 'next/server';
import { getTicket, getTicketMessages, createMessage, updateTicket } from '@/lib/tickets';
import { trackFirstResponse } from '@/lib/sla';
import { kv } from '@/lib/kv';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    const messages = await getTicketMessages(id);
    
    // Get read message IDs
    const readMessageIds: string[] = await kv.smembers(`ticket:${id}:read`);
    const readSet = new Set(readMessageIds);
    
    // Add isRead flag to each message
    const messagesWithReadStatus = messages.map(msg => ({
      ...msg,
      isRead: readSet.has(msg.id) || msg.sender === 'admin', // Admin messages are always considered "read"
    }));

    return NextResponse.json(messagesWithReadStatus);
  } catch (error) {
    console.error('Failed to get messages:', error);
    return NextResponse.json({ message: 'Fehler beim Laden der Nachrichten.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    const body = await req.json();
    const { content, senderName, senderEmail } = body;

    if (!content) {
      return NextResponse.json({ message: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    // Reopen ticket if closed or resolved when staff adds a message
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      await updateTicket(id, { status: 'in_progress' });
    }

    const message = await createMessage({
      ticketId: id,
      content,
      sender: 'admin',
      senderName: senderName || 'Support Team',
      senderEmail: senderEmail || process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
    });

    // Track first response for SLA
    await trackFirstResponse(id);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Failed to create message:', error);
    return NextResponse.json({ message: 'Fehler beim Erstellen der Nachricht.' }, { status: 500 });
  }
}
