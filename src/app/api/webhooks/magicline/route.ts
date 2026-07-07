import { NextRequest, NextResponse } from 'next/server';

// Magicline Webhook Events Handler
// Events: CONTRACT_CANCELLED, CONTRACT_CREATED, CUSTOMER_CREATED

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (x-api-key header)
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.MAGICLINE_WEBHOOK_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      console.error('[Magicline Webhook] Invalid API key');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const eventType = payload.eventType || payload.event || 'unknown';
    
    console.log(`[Magicline Webhook] Received: ${eventType}`, JSON.stringify(payload, null, 2));

    const timestamp = new Date().toISOString();

    // Handle specific events
    switch (eventType) {
      case 'CUSTOMER_CREATED':
        console.log(`[Magicline] New customer: ${payload.data?.firstName} ${payload.data?.lastName}`);
        // TODO: Send notification to Sir
        break;
        
      case 'CONTRACT_CREATED':
        console.log(`[Magicline] New contract for customer ${payload.data?.customerId}`);
        // Weiterleitung der kompletten Original-Payload an die Fit-Inn Mitglieder-App.
        // Diese verschickt daraufhin automatisch die Zugangs-/Willkommensmail an das
        // neue Mitglied. Fehler dürfen die 200-Antwort an Magicline nicht beeinflussen.
        try {
          await fetch(
            'https://mitglieder.fit-inn-trier.de/api/webhooks/magicline?key=' +
              encodeURIComponent(process.env.FITINN_WEBHOOK_KEY || ''),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );
        } catch (err) {
          console.error('Fit-Inn-Weiterleitung fehlgeschlagen:', err);
        }
        // TODO: Send notification to Sir
        break;
        
      case 'CONTRACT_CANCELLED':
        console.log(`[Magicline] Contract cancelled for customer ${payload.data?.customerId}`);
        // TODO: Send notification to Sir, create ticket
        break;
        
      default:
        console.log(`[Magicline] Unknown event type: ${eventType}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received',
      eventType,
      timestamp
    });

  } catch (error) {
    console.error('[Magicline Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// HEAD request for Magicline to verify endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// GET for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'Magicline Webhook Endpoint',
    timestamp: new Date().toISOString()
  });
}
