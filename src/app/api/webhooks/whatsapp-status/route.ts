import { NextRequest, NextResponse } from 'next/server';
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
  try {
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    
    if (!TWILIO_AUTH_TOKEN) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return new Response('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const formParams: Record<string, string> = {};
    let messageSid = '';
    let messageStatus = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      
      // Collect all form parameters for signature validation
      for (const [key, value] of formData.entries()) {
        formParams[key] = value.toString();
      }

      messageSid = formData.get('MessageSid')?.toString() || '';
      messageStatus = formData.get('MessageStatus')?.toString() || '';

      // Validate Twilio signature
      const twilioSignature = req.headers.get('x-twilio-signature');
      const webhookUrl = `https://${req.headers.get('host')}${new URL(req.url).pathname}`;
      
      if (twilioSignature && !validateTwilioSignature(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, formParams)) {
        console.error('Invalid Twilio signature');
        return new Response('Forbidden', { status: 403 });
      }

      console.log('Twilio status webhook received:', { messageSid, messageStatus });
    } else {
      console.error('Unsupported content type:', contentType);
      return new Response('Bad Request', { status: 400 });
    }

    if (!messageSid || !messageStatus) {
      console.log('Missing MessageSid or MessageStatus');
      return new Response('OK', { status: 200 });
    }

    // Find the message by WhatsApp message ID
    const message = await findMessageByExternalId(messageSid, 'whatsapp');

    if (!message) {
      console.log(`Message not found for MessageSid: ${messageSid}`);
      return new Response('OK', { status: 200 });
    }

    const now = new Date().toISOString();

    // Map Twilio status to our status
    switch (messageStatus.toLowerCase()) {
      case 'sent':
        await updateMessageStatus(message.id, 'sent');
        break;

      case 'delivered':
        await updateMessageStatus(message.id, 'delivered', { deliveredAt: now });
        console.log(`WhatsApp message delivered: ${messageSid}`);
        break;

      case 'read':
        await updateMessageStatus(message.id, 'read', { readAt: now });
        console.log(`WhatsApp message read: ${messageSid}`);
        break;

      case 'failed':
      case 'undelivered':
        const errorCode = formParams['ErrorCode'] || 'Unknown';
        const errorMessage = formParams['ErrorMessage'] || 'Unknown error';
        await updateMessageStatus(message.id, 'failed', {
          failureReason: `${messageStatus}: ${errorCode} - ${errorMessage}`,
        });
        console.log(`WhatsApp message failed: ${messageSid} - ${errorCode}`);
        break;

      default:
        console.log(`Unhandled WhatsApp status: ${messageStatus}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error processing Twilio status webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
