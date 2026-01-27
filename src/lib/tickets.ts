import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

// Types
export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  channel?: 'email' | 'whatsapp' | 'web';
  phone?: string;
  resolvedAt?: string; // Timestamp when ticket was marked as resolved (for auto-close)
  tags?: string[]; // Custom tags for categorization
  aiStatus?: 'active' | 'escalated' | 'disabled'; // AI handling status
}

// Internal notes (only visible to admins)
export interface TicketNote {
  [key: string]: string; // Index signature for KV storage
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  createdBy: string; // Admin username or email
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  sender: 'customer' | 'admin';
  senderName: string;
  senderEmail: string;
  createdAt: string;
  emailMessageId?: string;
  whatsappMessageId?: string;
  channel?: 'email' | 'whatsapp' | 'web';
  attachments?: Attachment[];
  // Delivery status tracking
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  // Smart channel selection: how the admin message was delivered
  deliveryChannel?: 'live' | 'email' | 'whatsapp';
}

// Helper: Generate ticket number
async function generateTicketNumber(): Promise<string> {
  const counter = await kv.incr('tickets:counter');
  return `TKT-${String(counter).padStart(3, '0')}`;
}

// Ticket CRUD Operations
export async function createTicket(data: {
  subject: string;
  customerName: string;
  customerEmail: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  attachments?: Attachment[];
  channel?: 'email' | 'whatsapp' | 'web';
  phone?: string;
}): Promise<{ ticket: Ticket; message: TicketMessage }> {
  const ticketId = crypto.randomUUID();
  const ticketNumber = await generateTicketNumber();
  const now = new Date().toISOString();

  const ticket: Ticket = {
    id: ticketId,
    ticketNumber,
    subject: data.subject,
    status: 'open',
    priority: data.priority || 'medium',
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    createdAt: now,
    updatedAt: now,
    channel: data.channel || 'web',
    // AI only for WhatsApp and Portal/Chat - NOT for emails
    aiStatus: data.channel === 'email' ? 'disabled' : 'active',
    ...(data.phone && { phone: data.phone }),
  };

  // Filter out undefined/null values for Redis
  const ticketForKV = Object.fromEntries(
    Object.entries(ticket).filter(([_, v]) => v != null)
  );

  // Save ticket
  await kv.hmset(`ticket:${ticketId}`, ticketForKV);
  await kv.sadd('tickets:ids', ticketId);

  // Index by email for lookup
  await kv.sadd(`tickets:email:${data.customerEmail.toLowerCase()}`, ticketId);
  
  // Index by phone for WhatsApp lookup
  if (data.phone) {
    await kv.sadd(`tickets:phone:${data.phone}`, ticketId);
  }

  // Create initial message
  const message = await createMessage({
    ticketId,
    content: data.content,
    sender: 'customer',
    senderName: data.customerName,
    senderEmail: data.customerEmail,
    attachments: data.attachments,
  });

  return { ticket, message };
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const ticket = await kv.hgetall(`ticket:${id}`);
  if (!ticket || Object.keys(ticket).length === 0) {
    return null;
  }
  return ticket as unknown as Ticket;
}

export async function getAllTickets(): Promise<Ticket[]> {
  const ticketIds: string[] = await kv.smembers('tickets:ids');
  if (ticketIds.length === 0) {
    return [];
  }

  const tickets = await Promise.all(
    ticketIds.map(async (id) => {
      const ticket = await kv.hgetall(`ticket:${id}`);
      return ticket as unknown as Ticket;
    })
  );

  // Filter out null entries and sort by createdAt (newest first)
  return tickets
    .filter((t): t is Ticket => t !== null && Object.keys(t).length > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateTicket(
  id: string,
  updates: Partial<Pick<Ticket, 'status' | 'priority' | 'assignedTo'>>
): Promise<Ticket | null> {
  const ticket = await getTicket(id);
  if (!ticket) {
    return null;
  }

  const now = new Date().toISOString();

  // Track resolvedAt timestamp for auto-close functionality
  let resolvedAt = ticket.resolvedAt;
  if (updates.status === 'resolved' && ticket.status !== 'resolved') {
    // Just became resolved - set timestamp
    resolvedAt = now;
  } else if (updates.status && updates.status !== 'resolved') {
    // Status changed to something other than resolved - clear timestamp
    resolvedAt = undefined;
  }

  const updatedTicket: Ticket = {
    ...ticket,
    ...updates,
    updatedAt: now,
    ...(resolvedAt ? { resolvedAt } : {}),
  };

  // Remove resolvedAt if it was cleared
  if (!resolvedAt) {
    delete updatedTicket.resolvedAt;
    await kv.hdel(`ticket:${id}`, 'resolvedAt');
  }

  const updatedTicketForKV = Object.fromEntries(
    Object.entries(updatedTicket).filter(([_, v]) => v != null)
  );

  await kv.hmset(`ticket:${id}`, updatedTicketForKV);
  return updatedTicket;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const ticket = await getTicket(id);
  if (!ticket) {
    return false;
  }

  // Delete all messages in parallel
  const messageIds: string[] = await kv.smembers(`ticket:${id}:messages`);

  await Promise.all([
    // Delete all messages
    ...messageIds.map(msgId => kv.del(`message:${msgId}`)),
    // Delete message index
    kv.del(`ticket:${id}:messages`),
    // Delete read status
    kv.del(`ticket:${id}:read`),
    // Remove from email index
    kv.srem(`tickets:email:${ticket.customerEmail.toLowerCase()}`, id),
    // Remove from phone index if exists
    ...(ticket.phone ? [kv.srem(`tickets:phone:${ticket.phone}`, id)] : []),
    // Delete ticket
    kv.del(`ticket:${id}`),
    // Remove from tickets list
    kv.srem('tickets:ids', id),
  ]);

  return true;
}

// Batch delete multiple tickets efficiently
export async function deleteTickets(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const success = await deleteTicket(id);
        return { id, success };
      } catch {
        return { id, success: false };
      }
    })
  );

  return {
    deleted: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).map(r => r.id),
  };
}

// Batch update status for multiple tickets
export async function updateTicketsStatus(
  ids: string[],
  status: Ticket['status']
): Promise<{ updated: number; failed: string[] }> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const ticket = await updateTicket(id, { status });
        return { id, success: ticket !== null };
      } catch {
        return { id, success: false };
      }
    })
  );

  return {
    updated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).map(r => r.id),
  };
}

// Get tickets that should be auto-closed (resolved for more than 1 hour)
export async function getTicketsToAutoClose(): Promise<Ticket[]> {
  const tickets = await getAllTickets();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  return tickets.filter(
    (t) => t.status === 'resolved' && t.resolvedAt && t.resolvedAt < oneHourAgo
  );
}

// Auto-close resolved tickets (called by cron job)
export async function autoCloseResolvedTickets(): Promise<{ closed: number; failed: string[] }> {
  const ticketsToClose = await getTicketsToAutoClose();

  if (ticketsToClose.length === 0) {
    return { closed: 0, failed: [] };
  }

  const result = await updateTicketsStatus(
    ticketsToClose.map((t) => t.id),
    'closed'
  );

  return { closed: result.updated, failed: result.failed };
}

// Message Operations
export async function createMessage(data: {
  ticketId: string;
  content: string;
  sender: 'customer' | 'admin';
  senderName: string;
  senderEmail: string;
  emailMessageId?: string;
  whatsappMessageId?: string;
  channel?: 'email' | 'whatsapp' | 'web';
  attachments?: Attachment[];
  deliveryChannel?: 'live' | 'email' | 'whatsapp';
}): Promise<TicketMessage> {
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  const message: TicketMessage = {
    id: messageId,
    ticketId: data.ticketId,
    content: data.content,
    sender: data.sender,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    createdAt: now,
    status: 'sent', // Initial status
    ...(data.emailMessageId && { emailMessageId: data.emailMessageId }),
    ...(data.whatsappMessageId && { whatsappMessageId: data.whatsappMessageId }),
    ...(data.channel && { channel: data.channel }),
    ...(data.attachments && data.attachments.length > 0 && { attachments: data.attachments }),
    ...(data.deliveryChannel && { deliveryChannel: data.deliveryChannel }),
  };

  // Filter out undefined/null values for Redis
  const messageForKV = Object.fromEntries(
    Object.entries(message).filter(([_, v]) => v != null)
  );

  await kv.hmset(`message:${messageId}`, messageForKV);
  await kv.sadd(`ticket:${data.ticketId}:messages`, messageId);

  // Update ticket timestamp
  await kv.hset(`ticket:${data.ticketId}`, { updatedAt: now });

  return message;
}

// Update message delivery status
export async function updateMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  additionalData?: { deliveredAt?: string; readAt?: string; failureReason?: string }
): Promise<boolean> {
  try {
    const message = await kv.hgetall(`message:${messageId}`);
    if (!message || Object.keys(message).length === 0) {
      return false;
    }

    const updates: Record<string, string> = { status };
    
    if (additionalData?.deliveredAt) {
      updates.deliveredAt = additionalData.deliveredAt;
    }
    if (additionalData?.readAt) {
      updates.readAt = additionalData.readAt;
    }
    if (additionalData?.failureReason) {
      updates.failureReason = additionalData.failureReason;
    }

    await kv.hmset(`message:${messageId}`, updates);
    return true;
  } catch (err) {
    console.error('Failed to update message status:', err);
    return false;
  }
}

// Find message by email or WhatsApp message ID
export async function findMessageByExternalId(
  externalId: string,
  type: 'email' | 'whatsapp'
): Promise<TicketMessage | null> {
  const allTicketIds: string[] = await kv.smembers('tickets:ids');
  
  for (const ticketId of allTicketIds) {
    const messageIds: string[] = await kv.smembers(`ticket:${ticketId}:messages`);
    
    for (const messageId of messageIds) {
      const message = await kv.hgetall(`message:${messageId}`) as unknown as TicketMessage;
      
      if (type === 'email' && message.emailMessageId === externalId) {
        return message;
      }
      if (type === 'whatsapp' && message.whatsappMessageId === externalId) {
        return message;
      }
    }
  }
  
  return null;
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const messageIds: string[] = await kv.smembers(`ticket:${ticketId}:messages`);
  if (messageIds.length === 0) {
    return [];
  }

  const messages = await Promise.all(
    messageIds.map(async (id) => {
      const message = await kv.hgetall(`message:${id}`);
      return message as unknown as TicketMessage;
    })
  );

  // Filter and sort by createdAt (oldest first for chat display)
  return messages
    .filter((m): m is TicketMessage => m !== null && Object.keys(m).length > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Get count of unread messages (customer messages that haven't been read)
export async function getUnreadMessageCount(ticketId: string): Promise<number> {
  const messageIds: string[] = await kv.smembers(`ticket:${ticketId}:messages`);
  if (messageIds.length === 0) {
    return 0;
  }

  const readMessageIds: string[] = await kv.smembers(`ticket:${ticketId}:read`);
  const readSet = new Set(readMessageIds);

  // Count customer messages that are not read
  let unreadCount = 0;
  for (const messageId of messageIds) {
    if (!readSet.has(messageId)) {
      const message = await kv.hgetall(`message:${messageId}`);
      if (message && (message as unknown as TicketMessage).sender === 'customer') {
        unreadCount++;
      }
    }
  }

  return unreadCount;
}

// Mark messages as read
export async function markMessagesAsRead(ticketId: string, messageIds?: string[]): Promise<void> {
  if (messageIds && messageIds.length > 0) {
    // Mark specific messages as read
    await Promise.all(
      messageIds.map(id => kv.sadd(`ticket:${ticketId}:read`, id))
    );
  } else {
    // Mark all customer messages in this ticket as read
    const allMessageIds: string[] = await kv.smembers(`ticket:${ticketId}:messages`);
    const customerMessageIds: string[] = [];

    for (const messageId of allMessageIds) {
      const message = await kv.hgetall(`message:${messageId}`);
      if (message && (message as unknown as TicketMessage).sender === 'customer') {
        customerMessageIds.push(messageId);
      }
    }

    if (customerMessageIds.length > 0) {
      await Promise.all(
        customerMessageIds.map(id => kv.sadd(`ticket:${ticketId}:read`, id))
      );
    }
  }
}

// Get unread message count for all tickets (for list view)
export async function getAllTicketsWithUnreadCount(): Promise<Array<Ticket & { unreadCount: number }>> {
  const tickets = await getAllTickets();
  
  const ticketsWithUnread = await Promise.all(
    tickets.map(async (ticket) => {
      const unreadCount = await getUnreadMessageCount(ticket.id);
      return { ...ticket, unreadCount };
    })
  );

  return ticketsWithUnread;
}

// Find ticket by email (for incoming email processing)
export async function findTicketsByEmail(email: string): Promise<Ticket[]> {
  const ticketIds: string[] = await kv.smembers(`tickets:email:${email.toLowerCase()}`);
  if (ticketIds.length === 0) {
    return [];
  }

  const tickets = await Promise.all(
    ticketIds.map(async (id) => {
      const ticket = await kv.hgetall(`ticket:${id}`);
      return ticket as unknown as Ticket;
    })
  );

  return tickets
    .filter((t): t is Ticket => t !== null && Object.keys(t).length > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Find ticket by phone number (for WhatsApp)
// Returns tickets sorted by status priority (open first) then by updatedAt
// Includes closed/resolved tickets so customers can reply and reopen them
export async function findTicketsByPhone(phone: string): Promise<Ticket[]> {
  const ticketIds: string[] = await kv.smembers(`tickets:phone:${phone}`);
  if (ticketIds.length === 0) {
    return [];
  }

  const tickets = await Promise.all(
    ticketIds.map(async (id) => {
      const ticket = await kv.hgetall(`ticket:${id}`);
      return ticket as unknown as Ticket;
    })
  );

  // Sort: open/in_progress tickets first, then resolved/closed, then by updatedAt (newest first)
  const statusPriority: Record<string, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
  return tickets
    .filter((t): t is Ticket => t !== null && Object.keys(t).length > 0)
    .sort((a, b) => {
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

// Find ticket by ticket number (for email subject parsing)
export async function findTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  const ticketIds: string[] = await kv.smembers('tickets:ids');

  for (const id of ticketIds) {
    const ticket = await kv.hgetall(`ticket:${id}`);
    if (ticket && (ticket as unknown as Ticket).ticketNumber === ticketNumber) {
      return ticket as unknown as Ticket;
    }
  }

  return null;
}

// Parse ticket number from subject or message body
export function parseTicketNumberFromSubject(text: string): string | null {
  const match = text.match(/\[?(TKT-\d+)\]?/i);
  return match ? match[1].toUpperCase() : null;
}

// ============================================
// TICKET NOTES (Internal Notes for Admins)
// ============================================

// Create a note for a ticket
export async function createTicketNote(data: {
  ticketId: string;
  content: string;
  createdBy: string;
}): Promise<TicketNote> {
  const noteId = crypto.randomUUID();
  const now = new Date().toISOString();

  const note: TicketNote = {
    id: noteId,
    ticketId: data.ticketId,
    content: data.content,
    createdAt: now,
    createdBy: data.createdBy,
  };

  await kv.hmset(`note:${noteId}`, note);
  await kv.lpush(`ticket:${data.ticketId}:notes`, noteId);

  return note;
}

// Get all notes for a ticket (newest first)
export async function getTicketNotes(ticketId: string): Promise<TicketNote[]> {
  const noteIds: string[] = await kv.lrange(`ticket:${ticketId}:notes`, 0, -1);
  if (noteIds.length === 0) {
    return [];
  }

  const notes = await Promise.all(
    noteIds.map(async (id) => {
      const note = await kv.hgetall(`note:${id}`);
      return note as unknown as TicketNote;
    })
  );

  return notes.filter((n): n is TicketNote => n !== null && Object.keys(n).length > 0);
}

// Delete a note
export async function deleteTicketNote(ticketId: string, noteId: string): Promise<boolean> {
  try {
    await kv.lrem(`ticket:${ticketId}:notes`, 0, noteId);
    await kv.del(`note:${noteId}`);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// TICKET TAGS
// ============================================

// Default tags available in the system
export const DEFAULT_TAGS = [
  { id: "urgent", name: "Dringend", color: "red" },
  { id: "callback", name: "Rückruf", color: "yellow" },
  { id: "cancellation", name: "Kündigung", color: "orange" },
  { id: "complaint", name: "Beschwerde", color: "purple" },
  { id: "praise", name: "Lob", color: "green" },
  { id: "billing", name: "Abrechnung", color: "blue" },
  { id: "membership", name: "Mitgliedschaft", color: "teal" },
];

// Get all available tags
export async function getAllTags(): Promise<Array<{ id: string; name: string; color: string }>> {
  const customTags = await kv.smembers("admin:ticket-tags");

  // Parse custom tags (stored as JSON strings)
  const parsedCustomTags = customTags.map((tag: unknown) => {
    if (typeof tag === 'string') {
      try {
        return JSON.parse(tag);
      } catch {
        return null;
      }
    }
    return tag;
  }).filter((t): t is { id: string; name: string; color: string } => t !== null);

  return [...DEFAULT_TAGS, ...parsedCustomTags];
}

// Add a custom tag
export async function addCustomTag(tag: { id: string; name: string; color: string }): Promise<void> {
  await kv.sadd("admin:ticket-tags", JSON.stringify(tag));
}

// Remove a custom tag
export async function removeCustomTag(tagId: string): Promise<void> {
  const customTags = await kv.smembers("admin:ticket-tags");

  for (const tag of customTags) {
    const parsed = typeof tag === 'string' ? JSON.parse(tag) : tag;
    if (parsed.id === tagId) {
      await kv.srem("admin:ticket-tags", typeof tag === 'string' ? tag : JSON.stringify(tag));
      break;
    }
  }
}

// Update ticket tags
export async function updateTicketTags(ticketId: string, tags: string[]): Promise<void> {
  await kv.hset(`ticket:${ticketId}`, {
    tags: JSON.stringify(tags),
    updatedAt: new Date().toISOString()
  });
}
