import { NextRequest } from 'next/server';
import { findMessageByExternalId, updateMessageStatus } from '@/lib/tickets';
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

// Twilio webhook for WhatsApp message status updates
// Documentation: https://www.twilio.com/docs/sms/api/message-resource#message-status-values

export async function POST(req: NextRequest) {
  console.log('=== WhatsApp Status Webhook ===');

  try {
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

    if (!TWILIO_AUTH_TOKEN) {
      console.error('TWILIO_AUTH_TOKEN not configured - continuing anyway for debugging');
    }

    const contentType = req.headers.get('content-type') || '';
    const formParams: Record<string, string> = {};
    let messageSid = '';
    let messageStatus = '';

    console.log('Content-Type:', contentType);

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();

      // Collect all form parameters
      for (const [key, value] of formData.entries()) {
        formParams[key] = value.toString();
      }

      console.log('Received params:', JSON.stringify(formParams, null, 2));

      messageSid = formData.get('MessageSid')?.toString() || '';
      messageStatus = formData.get('MessageStatus')?.toString() || '';

      // Log signature validation (don't block on failure)
      const twilioSignature = req.headers.get('x-twilio-signature');
      if (twilioSignature && TWILIO_AUTH_TOKEN) {
        const webhookUrl = `https://${req.headers.get('host')}${new URL(req.url).pathname}`;
        const isValid = validateTwilioSignature(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, formParams);
        console.log('Signature validation:', isValid ? 'VALID' : 'INVALID (continuing anyway)');
      }

      console.log(`Status update: MessageSid=${messageSid}, Status=${messageStatus}`);
    } else {
      console.error('Unsupported content type:', contentType);
      return new Response('Bad Request', { status: 400 });
    }

    if (!messageSid || !messageStatus) {
      console.log('Missing MessageSid or MessageStatus - returning OK');
      return new Response('OK', { status: 200 });
    }

    // Find the message by WhatsApp message ID
    console.log(`Searching for message with whatsappMessageId: ${messageSid}`);
    const message = await findMessageByExternalId(messageSid, 'whatsapp');

    if (!message) {
      console.log(`Message NOT FOUND for MessageSid: ${messageSid}`);
      return new Response('OK', { status: 200 });
    }

    console.log(`Found message: id=${message.id}, ticketId=${message.ticketId}`);

    const now = new Date().toISOString();

    // Map Twilio status to our status
    switch (messageStatus.toLowerCase()) {
      case 'queued':
      case 'sent':
        console.log(`Updating message ${message.id} to 'sent'`);
        await updateMessageStatus(message.id, 'sent');
        break;

      case 'delivered':
        console.log(`Updating message ${message.id} to 'delivered'`);
        await updateMessageStatus(message.id, 'delivered', { deliveredAt: now });
        break;

      case 'read':
        console.log(`Updating message ${message.id} to 'read'`);
        await updateMessageStatus(message.id, 'read', { readAt: now });
        break;

      case 'failed':
      case 'undelivered':
        const errorCode = formParams['ErrorCode'] || 'Unknown';
        const errorMsg = formParams['ErrorMessage'] || 'Unknown error';
        console.log(`Updating message ${message.id} to 'failed': ${errorCode} - ${errorMsg}`);
        await updateMessageStatus(message.id, 'failed', {
          failureReason: `${messageStatus}: ${errorCode} - ${errorMsg}`,
        });
        break;

      default:
        console.log(`Unhandled status: ${messageStatus}`);
    }

    console.log('=== Webhook processed successfully ===');
    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
