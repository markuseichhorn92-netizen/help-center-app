import { NextRequest, NextResponse } from 'next/server';
import { createTicket, createMessage, findTicketsByPhone, findTicketByNumber, parseTicketNumberFromSubject, updateTicket, getTicketMessages, Attachment } from '@/lib/tickets';
import { ensureContactFromTicket, updateLastContact } from '@/lib/contacts';
import { generateAutoReply, wantsHuman, markHumanRequested, isAutoReplyEnabled } from '@/lib/ai-autoreply';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendNewTicketNotification } from '@/lib/resend';
import { notifyNewMessage, notifyEscalation, notifyNewTicket } from '@/lib/push-notifications';
import { startFollowupTracking, updateCustomerActivity, stopFollowupTracking, checkForConversion } from '@/lib/whatsapp-followup';
import crypto from 'crypto';

// Validate Twilio request signature
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');
  
  return signature === expectedSignature;
}

// Helper to extract phone number from WhatsApp format (whatsapp:+1234567890)
function extractPhoneNumber(from: string): string {
  const phoneMatch = from.match(/whatsapp:(\+?\d+)/);
  return phoneMatch ? phoneMatch[1] : from.replace('whatsapp:', '');
}

export async function POST(req: NextRequest) {
  try {
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    
    if (!TWILIO_AUTH_TOKEN) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return new Response('Unauthorized', { status: 401 });
    }

    // Twilio sends form data for incoming WhatsApp messages
    const contentType = req.headers.get('content-type') || '';
    let from = '';
    let body = '';
    let profileName = '';
    let numMedia = 0;
    let mediaUrls: string[] = [];
    let mediaContentTypes: string[] = [];
    const formParams: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = formData.get('From')?.toString() || '';
      body = formData.get('Body')?.toString() || '';
      profileName = formData.get('ProfileName')?.toString() || '';
      numMedia = parseInt(formData.get('NumMedia')?.toString() || '0', 10);

      // Collect all form parameters for signature validation
      for (const [key, value] of formData.entries()) {
        formParams[key] = value.toString();
      }

      // Extract media URLs and content types
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`)?.toString();
        const mediaContentType = formData.get(`MediaContentType${i}`)?.toString();
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
          mediaContentTypes.push(mediaContentType || 'application/octet-stream');
        }
      }

      // Validate Twilio signature
      const twilioSignature = req.headers.get('x-twilio-signature');
      const webhookUrl = `https://${req.headers.get('host')}${new URL(req.url).pathname}`;
      
      if (twilioSignature && !validateTwilioSignature(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, formParams)) {
        console.error('Invalid Twilio signature');
        return new Response('Forbidden', { status: 403 });
      }

      console.log('Twilio WhatsApp message received:');
      console.log('From:', from);
      console.log('ProfileName:', profileName);
      console.log('Body:', body);
      console.log('NumMedia:', numMedia);
    } else {
      // Try JSON fallback
      const rawBody = await req.text();
      console.log('Raw webhook body:', rawBody.substring(0, 500));

      try {
        const webhookData = JSON.parse(rawBody);
        from = webhookData.From || '';
        body = webhookData.Body || '';
        profileName = webhookData.ProfileName || '';
      } catch {
        console.error('Failed to parse body');
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    const phoneNumber = extractPhoneNumber(from);

    if ((!body || body.trim() === '') && mediaUrls.length === 0) {
      console.log('No content (text or media) found');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    if (!phoneNumber) {
      console.log('No phone number found');
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Build attachments array from media
    const attachments: Attachment[] = mediaUrls.map((url, index) => {
      const contentType = mediaContentTypes[index];
      const extension = contentType.split('/')[1] || 'file';
      const filename = `whatsapp-media-${Date.now()}-${index}.${extension}`;
      
      return {
        id: crypto.randomUUID(),
        filename,
        url,
        contentType,
        size: 0, // Twilio doesn't provide size directly
      };
    });

    // Use body or default message for media-only messages
    const messageContent = body || (mediaUrls.length > 0 ? `📎 ${mediaUrls.length} Datei(en) gesendet` : '');

    // Check for ticket number in message
    const ticketNumber = parseTicketNumberFromSubject(messageContent);
    let existingTicket = ticketNumber ? await findTicketByNumber(ticketNumber) : null;

    // If no ticket found by number, try to find by phone
    if (!existingTicket) {
      const ticketsByPhone = await findTicketsByPhone(phoneNumber);
      if (ticketsByPhone.length > 0) {
        existingTicket = ticketsByPhone[0]; // Get most recent open ticket
      }
    }

    if (existingTicket) {
      // Add message to existing ticket
      console.log(`Adding message to existing ticket: ${existingTicket.ticketNumber}`);

      // Update follow-up tracking (resets 24h window timer)
      await updateCustomerActivity(existingTicket.id);
      
      // Check if customer indicates conversion (booked, signed up, etc.)
      if (checkForConversion(messageContent)) {
        await stopFollowupTracking(existingTicket.id);
        console.log(`[Follow-up] Customer converted or opted out, stopped tracking`);
      }

      // Check if customer wants to talk to a human
      const customerWantsHuman = wantsHuman(messageContent);
      if (customerWantsHuman) {
        await markHumanRequested(existingTicket.id);
        // Send push notification for escalation
        try {
          await notifyEscalation({
            ticketId: existingTicket.id,
            ticketNumber: existingTicket.ticketNumber,
            customerName: profileName || phoneNumber,
          });
        } catch (e) {
          console.error('[Push] Escalation notification failed:', e);
        }
      }

      await createMessage({
        ticketId: existingTicket.id,
        content: messageContent,
        sender: 'customer',
        senderName: profileName || phoneNumber,
        senderEmail: `${phoneNumber}@whatsapp`,
        channel: 'whatsapp',
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Send push notification for new message
      try {
        await notifyNewMessage({
          ticketId: existingTicket.id,
          ticketNumber: existingTicket.ticketNumber,
          customerName: profileName || phoneNumber,
          preview: messageContent,
        });
      } catch (e) {
        console.error('[Push] New message notification failed:', e);
      }

      // Update ticket status to open if it was closed/resolved
      if (existingTicket.status === 'closed' || existingTicket.status === 'resolved') {
        await updateTicket(existingTicket.id, { status: 'open' });
      }

      // Update contact last activity
      await updateLastContact(`${phoneNumber}@whatsapp`);

      // Generate AI auto-reply for WhatsApp
      const autoReplyEnabled = await isAutoReplyEnabled(existingTicket.id);

      if (autoReplyEnabled && !customerWantsHuman) {
        console.log('Generating AI auto-reply for WhatsApp');

        const messages = await getTicketMessages(existingTicket.id);
        const aiResult = await generateAutoReply({
          customerMessage: messageContent,
          customerName: profileName || phoneNumber,
          ticketSubject: existingTicket.subject,
          conversationHistory: messages,
          isWhatsApp: true,
        });

        if (aiResult.success && aiResult.content) {
          // Send AI reply via WhatsApp
          const whatsappResult = await sendWhatsAppMessage({
            to: phoneNumber,
            message: aiResult.content,
            ticketNumber: existingTicket.ticketNumber,
          });

          if (whatsappResult.success) {
            // Save AI message in database
            await createMessage({
              ticketId: existingTicket.id,
              content: aiResult.content,
              sender: 'admin',
              senderName: 'FIT INN Assistent',
              senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
              channel: 'whatsapp',
              whatsappMessageId: whatsappResult.messageSid,
              deliveryChannel: 'whatsapp',
            });
            console.log('AI auto-reply sent via WhatsApp');
          }
        }
      } else if (customerWantsHuman) {
        // Send confirmation that human was requested
        const humanMessage = 'Ich habe einen Mitarbeiter benachrichtigt. Jemand aus unserem Team wird sich in Kurze bei dir melden. Vielen Dank fur deine Geduld!';

        const whatsappResult = await sendWhatsAppMessage({
          to: phoneNumber,
          message: humanMessage,
          ticketNumber: existingTicket.ticketNumber,
        });

        if (whatsappResult.success) {
          await createMessage({
            ticketId: existingTicket.id,
            content: humanMessage,
            sender: 'admin',
            senderName: 'FIT INN Assistent',
            senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
            channel: 'whatsapp',
            whatsappMessageId: whatsappResult.messageSid,
            deliveryChannel: 'whatsapp',
          });
        }
      }

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Create new ticket
    const { ticket } = await createTicket({
      subject: mediaUrls.length > 0 ? 'WhatsApp Nachricht mit Anhängen' : 'WhatsApp Nachricht',
      customerName: profileName || phoneNumber,
      customerEmail: `${phoneNumber}@whatsapp`,
      content: messageContent,
      priority: 'medium',
      channel: 'whatsapp',
      phone: phoneNumber,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Ensure contact exists
    await ensureContactFromTicket({
      name: profileName || phoneNumber,
      email: `${phoneNumber}@whatsapp`,
      phone: phoneNumber,
    });

    console.log(`New WhatsApp ticket created: ${ticket.ticketNumber}`);

    // Start follow-up tracking for sales nurturing
    await startFollowupTracking(ticket.id);

    // Notify admin about new WhatsApp ticket
    try {
      await sendNewTicketNotification({
        ticketNumber: ticket.ticketNumber,
        customerName: profileName || phoneNumber,
        customerEmail: `${phoneNumber}@whatsapp`,
        subject: ticket.subject,
        channel: 'whatsapp',
        isEscalation: false,
      });
    } catch (notifyError) {
      console.error('Failed to send admin notification:', notifyError);
    }

    // Send push notification for new ticket
    try {
      await notifyNewTicket({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerName: profileName || phoneNumber,
        subject: ticket.subject,
      });
    } catch (e) {
      console.error('[Push] New ticket notification failed:', e);
    }

    // Check if customer wants to talk to a human
    const customerWantsHuman = wantsHuman(messageContent);
    if (customerWantsHuman) {
      await markHumanRequested(ticket.id);
      // Send push notification for escalation
      try {
        await notifyEscalation({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          customerName: profileName || phoneNumber,
        });
      } catch (e) {
        console.error('[Push] Escalation notification failed:', e);
      }
    }

    // Generate AI auto-reply for new WhatsApp ticket
    if (!customerWantsHuman) {
      console.log('Generating AI auto-reply for new WhatsApp ticket');

      const aiResult = await generateAutoReply({
        customerMessage: messageContent,
        customerName: profileName || phoneNumber,
        ticketSubject: ticket.subject,
        isWhatsApp: true,
      });

      if (aiResult.success && aiResult.content) {
        // Send AI reply via WhatsApp
        const whatsappResult = await sendWhatsAppMessage({
          to: phoneNumber,
          message: aiResult.content,
          ticketNumber: ticket.ticketNumber,
        });

        if (whatsappResult.success) {
          // Save AI message in database
          await createMessage({
            ticketId: ticket.id,
            content: aiResult.content,
            sender: 'admin',
            senderName: 'FIT INN Assistent',
            senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
            channel: 'whatsapp',
            whatsappMessageId: whatsappResult.messageSid,
            deliveryChannel: 'whatsapp',
          });
          console.log('AI auto-reply sent via WhatsApp for new ticket');
        }
      }
    } else {
      // Customer wants human - send confirmation
      const humanMessage = 'Vielen Dank fur deine Nachricht! Ich habe ein Ticket fur dich erstellt und einen Mitarbeiter benachrichtigt. Jemand aus unserem Team wird sich in Kurze bei dir melden.';

      const whatsappResult = await sendWhatsAppMessage({
        to: phoneNumber,
        message: humanMessage,
        ticketNumber: ticket.ticketNumber,
      });

      if (whatsappResult.success) {
        await createMessage({
          ticketId: ticket.id,
          content: humanMessage,
          sender: 'admin',
          senderName: 'FIT INN Assistent',
          senderEmail: process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de',
          channel: 'whatsapp',
          whatsappMessageId: whatsappResult.messageSid,
          deliveryChannel: 'whatsapp',
        });
      }
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error: any) {
    console.error('Error processing WhatsApp message:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  }
}
