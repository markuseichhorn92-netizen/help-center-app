import { NextRequest, NextResponse } from 'next/server';
import { getTicket, createMessage, getTicketMessages } from '@/lib/tickets';
import { sendTicketReply } from '@/lib/resend';

// Helper function to check authentication
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth) {
    return false;
  }
  const authValue = basicAuth.split(' ')[1];
  const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  return user === ADMIN_USER && password === ADMIN_PASS;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    const body = await req.json();
    const { content, senderName, attachments } = body;

    if (!content) {
      return NextResponse.json({ message: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    // Get last message for threading
    const messages = await getTicketMessages(id);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Send email
    console.log('Sending email to:', ticket.customerEmail);
    console.log('RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    console.log('SUPPORT_EMAIL:', process.env.SUPPORT_EMAIL);

    const emailResult = await sendTicketReply(
      ticket.customerEmail,
      ticket.customerName,
      ticket.ticketNumber,
      ticket.subject,
      content,
      lastMessage?.emailMessageId,
      attachments
    );

    console.log('Email result:', emailResult);

    // Create message in database
    const message = await createMessage({
      ticketId: id,
      content,
      sender: 'admin',
      senderName: senderName || 'Support Team',
      senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
      emailMessageId: emailResult.messageId,
      attachments: attachments || [],
    });

    return NextResponse.json({
      message,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to send reply:', error);
    return NextResponse.json({
      message: 'Fehler beim Senden der Antwort.',
      error: error.message
    }, { status: 500 });
  }
}
