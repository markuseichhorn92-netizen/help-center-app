import { NextRequest, NextResponse } from 'next/server';
import { findMessageByExternalId, updateMessageStatus } from '@/lib/tickets';

// Resend webhook for email delivery status
// Documentation: https://resend.com/docs/dashboard/webhooks/event-types

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('Resend webhook received:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    if (!data?.email_id) {
      console.log('No email_id in webhook data');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const emailMessageId = data.email_id;

    // Find the message by email ID
    const message = await findMessageByExternalId(emailMessageId, 'email');

    if (!message) {
      console.log(`Message not found for email ID: ${emailMessageId}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const now = new Date().toISOString();

    // Handle different event types
    switch (type) {
      case 'email.delivered':
        await updateMessageStatus(message.id, 'delivered', { deliveredAt: now });
        console.log(`Email delivered: ${emailMessageId}`);
        break;

      case 'email.opened':
        await updateMessageStatus(message.id, 'read', { readAt: now });
        console.log(`Email opened: ${emailMessageId}`);
        break;

      case 'email.bounced':
      case 'email.delivery_delayed':
      case 'email.complained':
        await updateMessageStatus(message.id, 'failed', {
          failureReason: `${type}: ${data.bounce_type || data.reason || 'Unknown'}`,
        });
        console.log(`Email failed: ${emailMessageId} - ${type}`);
        break;

      default:
        console.log(`Unhandled email event type: ${type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
