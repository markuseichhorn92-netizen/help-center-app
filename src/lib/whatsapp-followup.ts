import { kv } from '@vercel/kv';

export interface FollowupState {
  lastCustomerMessage: string; // ISO timestamp
  lastFollowup: string | null; // ISO timestamp
  followupCount: number;
  conversationStart: string; // ISO timestamp
  closed: boolean;
}

/**
 * Start tracking a conversation for follow-up
 */
export async function startFollowupTracking(ticketId: string): Promise<void> {
  const key = `whatsapp:followup:${ticketId}`;
  const existing = await kv.get<FollowupState>(key);
  
  if (!existing) {
    const now = new Date().toISOString();
    await kv.set(key, {
      lastCustomerMessage: now,
      lastFollowup: null,
      followupCount: 0,
      conversationStart: now,
      closed: false,
    } as FollowupState);
    console.log(`[WhatsApp Follow-up] Started tracking ticket ${ticketId}`);
  }
}

/**
 * Update last customer message timestamp (resets follow-up timer)
 */
export async function updateCustomerActivity(ticketId: string): Promise<void> {
  const key = `whatsapp:followup:${ticketId}`;
  const existing = await kv.get<FollowupState>(key);
  
  if (existing) {
    await kv.set(key, {
      ...existing,
      lastCustomerMessage: new Date().toISOString(),
    });
    console.log(`[WhatsApp Follow-up] Updated customer activity for ticket ${ticketId}`);
  } else {
    // Start tracking if not exists
    await startFollowupTracking(ticketId);
  }
}

/**
 * Stop tracking (customer converted or explicitly unsubscribed)
 */
export async function stopFollowupTracking(ticketId: string): Promise<void> {
  const key = `whatsapp:followup:${ticketId}`;
  const existing = await kv.get<FollowupState>(key);
  
  if (existing) {
    await kv.set(key, { ...existing, closed: true });
    console.log(`[WhatsApp Follow-up] Stopped tracking ticket ${ticketId}`);
  }
}

/**
 * Check if customer mentioned booking/conversion keywords
 */
export function checkForConversion(message: string): boolean {
  const conversionKeywords = [
    'gebucht',
    'angemeldet',
    'mitglied',
    'termin gemacht',
    'komme vorbei',
    'bis dann',
    'danke für die info',
    'kein interesse',
    'nicht interessiert',
    'abmelden',
    'stop',
    'keine nachrichten'
  ];
  
  const lowerMessage = message.toLowerCase();
  return conversionKeywords.some(keyword => lowerMessage.includes(keyword));
}
