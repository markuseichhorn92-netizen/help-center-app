import { NextRequest, NextResponse } from 'next/server';
import { getTicket, createMessage, getTicketMessages, Attachment } from '@/lib/tickets';
import { sendTicketReply } from '@/lib/resend';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(
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

    const body = await req.json();
    const { content, senderName, attachments }: { 
      content: string; 
      senderName?: string; 
      attachments?: Attachment[] 
    } = body;

    if (!content) {
      return NextResponse.json({ message: 'Nachricht darf nicht leer sein.' }, { status: 400 });
    }

    // Get all messages for conversation history
    const messages = await getTicketMessages(id);
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // Determine channel
    const channel = (ticket as any).channel || 'email';
    const isWhatsApp = channel === 'whatsapp';

    let messageResult: { success: boolean; messageId?: string; messageSid?: string; error?: string } = { success: false };

    if (isWhatsApp && ticket.phone) {
      // Send via WhatsApp
      console.log('Sending WhatsApp to:', ticket.phone);
      console.log('TWILIO_ACCOUNT_SID configured:', !!process.env.TWILIO_ACCOUNT_SID);

      const whatsappResult = await sendWhatsAppMessage({
        to: ticket.phone,
        message: content,
        ticketNumber: ticket.ticketNumber,
        attachments: attachments?.map(att => ({
          filename: att.filename,
          url: att.url,
          contentType: att.contentType,
          size: att.size,
        })),
      });

      console.log('WhatsApp result:', whatsappResult);

      messageResult = {
        success: whatsappResult.success,
        messageSid: whatsappResult.messageSid,
        error: whatsappResult.error,
      };

      // Create message in database
      const message = await createMessage({
        ticketId: id,
        content,
        sender: 'admin',
        senderName: senderName || 'Support Team',
        senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
        whatsappMessageId: whatsappResult.messageSid,
        channel: 'whatsapp',
        attachments: attachments || [],
      });

      return NextResponse.json({
        message,
        whatsappSent: whatsappResult.success,
        whatsappError: whatsappResult.error,
      }, { status: 201 });
    } else {
      // Send via Email
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
        attachments,
        messages // Pass conversation history
      );

      console.log('Email result:', emailResult);

      messageResult = {
        success: emailResult.success,
        messageId: emailResult.messageId,
        error: emailResult.error,
      };

      // Create message in database
      const message = await createMessage({
        ticketId: id,
        content,
        sender: 'admin',
        senderName: senderName || 'Support Team',
        senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
        emailMessageId: emailResult.messageId,
        channel: 'email',
        attachments: attachments || [],
      });

      return NextResponse.json({
        message,
        emailSent: emailResult.success,
        emailError: emailResult.error,
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Failed to send reply:', error);
    return NextResponse.json({
      message: 'Fehler beim Senden der Antwort.',
      error: error.message
    }, { status: 500 });
  }
}
