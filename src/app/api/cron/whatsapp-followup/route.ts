import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { createMessage, getTicket } from '@/lib/tickets';
import { FollowupState } from '@/lib/whatsapp-followup';

// Follow-up messages (rotated based on attempt number)
const FOLLOWUP_MESSAGES = [
  "Hey! 👋 Ich wollte nochmal kurz nachfragen — hast du schon über das Probetraining nachgedacht? Diese Woche wären noch Termine frei! 💪",
  "Hi nochmal! 😊 Falls du noch Fragen hast, bin ich hier. Oder soll ich dir direkt einen Termin fürs kostenlose Probetraining vorschlagen?",
  "Nur kurz: Unser Angebot steht noch! Kostenloses Probetraining, kein Risiko, einfach mal reinschnuppern. Wann passt es dir? 🏋️",
  "Hey! Letzte Erinnerung von mir — wenn du Interesse hast, meld dich einfach. Ich bin hier um zu helfen! ✅ Probetraining buchen: https://angebot.fit-inn-trier.de/#probetraining"
];

// Final goodbye message after 1 week
const GOODBYE_MESSAGE = "Hey! 👋 Ich wollte mich kurz verabschieden. Falls du doch noch Interesse am FIT-INN hast, melde dich jederzeit! Wir freuen uns auf dich. Bis dann! 💪";

/**
 * Check if ticket needs follow-up (23h since last customer message, within 24h window)
 */
function needsFollowup(state: FollowupState): { needed: boolean; reason: string } {
  const now = Date.now();
  const lastCustomer = new Date(state.lastCustomerMessage).getTime();
  const hoursSinceCustomer = (now - lastCustomer) / (1000 * 60 * 60);
  
  // Already closed
  if (state.closed) {
    return { needed: false, reason: 'conversation_closed' };
  }
  
  // Check if conversation is older than 7 days
  const conversationAge = (now - new Date(state.conversationStart).getTime()) / (1000 * 60 * 60 * 24);
  if (conversationAge > 7) {
    return { needed: false, reason: 'max_duration_reached' };
  }
  
  // Check if we already sent 4 follow-ups
  if (state.followupCount >= 4) {
    return { needed: false, reason: 'max_followups_reached' };
  }
  
  // Check last follow-up timing
  if (state.lastFollowup) {
    const lastFollowupTime = new Date(state.lastFollowup).getTime();
    const hoursSinceFollowup = (now - lastFollowupTime) / (1000 * 60 * 60);
    
    // Don't send follow-up if we sent one less than 20 hours ago
    if (hoursSinceFollowup < 20) {
      return { needed: false, reason: 'recent_followup' };
    }
  }
  
  // Send follow-up between 20-23 hours after last customer message
  // This keeps the 24h window open while not being too aggressive
  if (hoursSinceCustomer >= 20 && hoursSinceCustomer <= 23.5) {
    return { needed: true, reason: 'window_closing' };
  }
  
  return { needed: false, reason: 'not_time_yet' };
}

/**
 * API route to process WhatsApp follow-ups
 * Should be called by cron every hour
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[WhatsApp Follow-up] Starting cron job...');
    
    // Get all active WhatsApp tickets from KV
    const ticketKeys = await kv.keys('whatsapp:followup:*');
    console.log(`[WhatsApp Follow-up] Found ${ticketKeys.length} tracked conversations`);
    
    const results: { ticketId: string; action: string; reason: string }[] = [];
    
    for (const key of ticketKeys) {
      const ticketId = key.replace('whatsapp:followup:', '');
      const state = await kv.get<FollowupState>(key);
      
      if (!state) continue;
      
      const { needed, reason } = needsFollowup(state);
      
      if (!needed) {
        // Check if we should send goodbye message (after 7 days or 4 follow-ups)
        if (reason === 'max_duration_reached' || reason === 'max_followups_reached') {
          if (!state.closed) {
            // Send goodbye and close
            const ticket = await getTicket(ticketId);
            if (ticket && ticket.phone) {
              await sendWhatsAppMessage({
                to: ticket.phone,
                message: GOODBYE_MESSAGE,
                ticketNumber: ticket.ticketNumber,
              });
              
              await createMessage({
                ticketId,
                content: GOODBYE_MESSAGE,
                sender: 'admin',
                senderName: 'Finn (Auto-Follow-up)',
                senderEmail: 'finn@fit-inn-trier.de',
                channel: 'whatsapp',
                deliveryChannel: 'whatsapp',
              });
              
              // Mark as closed
              await kv.set(key, { ...state, closed: true });
              results.push({ ticketId, action: 'goodbye_sent', reason });
            }
          }
        } else {
          results.push({ ticketId, action: 'skipped', reason });
        }
        continue;
      }
      
      // Send follow-up
      const ticket = await getTicket(ticketId);
      if (!ticket || !ticket.phone) {
        results.push({ ticketId, action: 'skipped', reason: 'no_phone' });
        continue;
      }
      
      // Pick follow-up message based on count
      const messageIndex = Math.min(state.followupCount, FOLLOWUP_MESSAGES.length - 1);
      const followupMessage = FOLLOWUP_MESSAGES[messageIndex];
      
      console.log(`[WhatsApp Follow-up] Sending follow-up #${state.followupCount + 1} to ${ticket.phone}`);
      
      const result = await sendWhatsAppMessage({
        to: ticket.phone,
        message: followupMessage,
        ticketNumber: ticket.ticketNumber,
      });
      
      if (result.success) {
        // Save message to ticket
        await createMessage({
          ticketId,
          content: followupMessage,
          sender: 'admin',
          senderName: 'Finn (Auto-Follow-up)',
          senderEmail: 'finn@fit-inn-trier.de',
          channel: 'whatsapp',
          whatsappMessageId: result.messageSid,
          deliveryChannel: 'whatsapp',
        });
        
        // Update state
        await kv.set(key, {
          ...state,
          lastFollowup: new Date().toISOString(),
          followupCount: state.followupCount + 1,
        });
        
        results.push({ ticketId, action: 'followup_sent', reason: `attempt_${state.followupCount + 1}` });
      } else {
        results.push({ ticketId, action: 'send_failed', reason: result.error || 'unknown' });
      }
    }
    
    console.log(`[WhatsApp Follow-up] Completed. Results:`, results);
    
    return NextResponse.json({
      success: true,
      processed: ticketKeys.length,
      results,
    });
  } catch (error: any) {
    console.error('[WhatsApp Follow-up] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
