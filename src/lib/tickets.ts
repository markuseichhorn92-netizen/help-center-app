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
  attachments?: Attachment[];
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

  const updatedTicket: Ticket = {
    ...ticket,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

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
    // Remove from email index
    kv.srem(`tickets:email:${ticket.customerEmail.toLowerCase()}`, id),
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

// Message Operations
export async function createMessage(data: {
  ticketId: string;
  content: string;
  sender: 'customer' | 'admin';
  senderName: string;
  senderEmail: string;
  emailMessageId?: string;
  attachments?: Attachment[];
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
    ...(data.emailMessageId && { emailMessageId: data.emailMessageId }),
    ...(data.attachments && data.attachments.length > 0 && { attachments: data.attachments }),
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
