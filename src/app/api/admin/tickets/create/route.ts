import { NextRequest, NextResponse } from 'next/server';
import { getTicket } from '@/lib/tickets';
import { ensureContactFromTicket } from '@/lib/contacts';
import { sendTicketReply } from '@/lib/resend';
import { generatePortalToken } from '@/lib/portal';
import { kv } from '@/lib/kv';

// POST /api/admin/tickets/create - Create new ticket from admin
export async function POST(req: NextRequest) {
  // Check session cookie
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      subject,
      content,
      priority = 'medium',
      sendEmail = true,
      channel = 'email',
    } = body;

    // Validate required fields
    if (!customerName || !customerEmail || !subject || !content) {
      return NextResponse.json(
        { error: 'Name, E-Mail, Betreff und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Create ticket with initial admin message
    const ticketId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create ticket manually to set it as admin-initiated
    // Generate proper ticket number
    const counter = await kv.incr('tickets:counter');
    const properTicketNumber = `TKT-${String(counter).padStart(3, '0')}`;

    const ticket = {
      id: ticketId,
      ticketNumber: properTicketNumber,
      subject,
      status: 'open' as const,
      priority,
      customerName,
      customerEmail,
      createdAt: now,
      updatedAt: now,
      channel,
    };

    // Save ticket
    await kv.hmset(`ticket:${ticketId}`, ticket);
    await kv.sadd('tickets:ids', ticketId);
    await kv.sadd(`tickets:email:${customerEmail.toLowerCase()}`, ticketId);

    // Create admin message
    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      ticketId,
      content,
      sender: 'admin' as const,
      senderName: 'Support Team',
      senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
      createdAt: now,
      channel,
      status: 'sent' as const,
    };

    await kv.hmset(`message:${messageId}`, message);
    await kv.sadd(`ticket:${ticketId}:messages`, messageId);

    // Ensure contact exists
    await ensureContactFromTicket({
      name: customerName,
      email: customerEmail,
    });

    // Send email if requested
    let emailSent = false;
    let emailError = null;

    if (sendEmail) {
      try {
        // Generate portal token for direct access
        const portalToken = await generatePortalToken(customerEmail, ticketId);

        const emailResult = await sendTicketReply(
          customerEmail,
          customerName,
          properTicketNumber,
          subject,
          content,
          undefined, // messageId
          undefined, // attachments
          undefined, // conversationHistory
          portalToken.token
        );

        if (emailResult.success && emailResult.messageId) {
          // Update message with email ID for tracking
          await kv.hset(`message:${messageId}`, {
            emailMessageId: emailResult.messageId,
          });
          emailSent = true;
        } else {
          emailError = emailResult.error || 'E-Mail konnte nicht gesendet werden';
        }
      } catch (err: any) {
        console.error('Failed to send email:', err);
        emailError = err.message;
      }
    }

    // Get full ticket data
    const fullTicket = await getTicket(ticketId);

    return NextResponse.json({
      success: true,
      ticket: fullTicket,
      message,
      emailSent,
      emailError,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tickets' },
      { status: 500 }
    );
  }
}
