import { kv } from '@vercel/kv';

// Add email to spam blacklist
export async function addToSpamBlacklist(email: string, reason?: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await kv.sadd('spam:blacklist', normalizedEmail);
  if (reason) {
    await kv.hset(`spam:blacklist:${normalizedEmail}`, {
      addedAt: new Date().toISOString(),
      reason,
    });
  }
}

// Remove email from spam blacklist
export async function removeFromSpamBlacklist(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await kv.srem('spam:blacklist', normalizedEmail);
  await kv.del(`spam:blacklist:${normalizedEmail}`);
}

// Check if email is on spam blacklist
export async function isSpamEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await kv.sismember('spam:blacklist', normalizedEmail);
  return result === 1;
}

// Get all blacklisted emails
export async function getSpamBlacklist(): Promise<string[]> {
  return await kv.smembers('spam:blacklist');
}

// Mark all tickets from an email as spam
export async function markAllTicketsFromEmailAsSpam(email: string, reason?: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim();
  const ticketIds = await kv.smembers('tickets:ids');
  let count = 0;

  for (const ticketId of ticketIds) {
    const ticket = await kv.hgetall(`ticket:${ticketId}`);
    if (ticket && (ticket.customerEmail as string)?.toLowerCase() === normalizedEmail) {
      // Update ticket with spam flag and reason
      await kv.hset(`ticket:${ticketId}`, { 
        status: 'closed', 
        isSpam: 'true',
        spamReason: reason || 'E-Mail-Adresse blockiert',
        updatedAt: new Date().toISOString()
      });
      // Move from active tickets to spam set
      await kv.srem('tickets:ids', ticketId);
      await kv.sadd('tickets:spam', ticketId);
      count++;
    }
  }

  return count;
}
