import { kv } from './kv';

// Types
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string; // Last time they sent/received a message
  ticketCount?: number;
}

// Contact CRUD Operations
export async function createContact(data: {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}): Promise<Contact> {
  // Check if contact with this email already exists
  const existing = await findContactByEmail(data.email);
  if (existing) {
    // Update existing contact with new data
    return updateContact(existing.id, {
      name: data.name || existing.name,
      phone: data.phone || existing.phone,
      notes: data.notes || existing.notes,
      tags: data.tags || existing.tags,
    }) as Promise<Contact>;
  }

  const contactId = crypto.randomUUID();
  const now = new Date().toISOString();

  const contact: Contact = {
    id: contactId,
    name: data.name,
    email: data.email.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    lastContactAt: now,
    ...(data.phone && { phone: data.phone }),
    ...(data.notes && { notes: data.notes }),
    ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
  };

  // Filter out undefined/null values for Redis
  const contactForKV = Object.fromEntries(
    Object.entries(contact).filter(([_, v]) => v != null)
  );

  await kv.hmset(`contact:${contactId}`, contactForKV);
  await kv.sadd('contacts:ids', contactId);

  // Index by email for lookup
  await kv.set(`contacts:email:${data.email.toLowerCase()}`, contactId);

  // Index by phone if provided
  if (data.phone) {
    await kv.set(`contacts:phone:${data.phone}`, contactId);
  }

  return contact;
}

export async function getContact(id: string): Promise<Contact | null> {
  const contact = await kv.hgetall(`contact:${id}`);
  if (!contact || Object.keys(contact).length === 0) {
    return null;
  }
  return contact as unknown as Contact;
}

export async function getAllContacts(): Promise<Contact[]> {
  const contactIds: string[] = await kv.smembers('contacts:ids');
  if (contactIds.length === 0) {
    return [];
  }

  const contacts = await Promise.all(
    contactIds.map(async (id) => {
      const contact = await kv.hgetall(`contact:${id}`);
      return contact as unknown as Contact;
    })
  );

  // Filter out null entries and sort by lastContactAt (newest first)
  return contacts
    .filter((c): c is Contact => c !== null && Object.keys(c).length > 0)
    .sort((a, b) => {
      const aDate = a.lastContactAt || a.createdAt;
      const bDate = b.lastContactAt || b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
}

export async function updateContact(
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'email' | 'phone' | 'notes' | 'tags' | 'lastContactAt'>>
): Promise<Contact | null> {
  const contact = await getContact(id);
  if (!contact) {
    return null;
  }

  const now = new Date().toISOString();

  // Handle email change - update index
  if (updates.email && updates.email.toLowerCase() !== contact.email) {
    await kv.del(`contacts:email:${contact.email}`);
    await kv.set(`contacts:email:${updates.email.toLowerCase()}`, id);
  }

  // Handle phone change - update index
  if (updates.phone !== undefined) {
    if (contact.phone) {
      await kv.del(`contacts:phone:${contact.phone}`);
    }
    if (updates.phone) {
      await kv.set(`contacts:phone:${updates.phone}`, id);
    }
  }

  const updatedContact: Contact = {
    ...contact,
    ...updates,
    email: updates.email ? updates.email.toLowerCase() : contact.email,
    updatedAt: now,
  };

  const updatedContactForKV = Object.fromEntries(
    Object.entries(updatedContact).filter(([_, v]) => v != null)
  );

  await kv.hmset(`contact:${id}`, updatedContactForKV);
  return updatedContact;
}

export async function deleteContact(id: string): Promise<boolean> {
  const contact = await getContact(id);
  if (!contact) {
    return false;
  }

  await Promise.all([
    kv.del(`contact:${id}`),
    kv.srem('contacts:ids', id),
    kv.del(`contacts:email:${contact.email}`),
    ...(contact.phone ? [kv.del(`contacts:phone:${contact.phone}`)] : []),
  ]);

  return true;
}

// Find contact by email
export async function findContactByEmail(email: string): Promise<Contact | null> {
  const contactId = await kv.get(`contacts:email:${email.toLowerCase()}`);
  if (!contactId) {
    return null;
  }
  return getContact(contactId as string);
}

// Find contact by phone
export async function findContactByPhone(phone: string): Promise<Contact | null> {
  const contactId = await kv.get(`contacts:phone:${phone}`);
  if (!contactId) {
    return null;
  }
  return getContact(contactId as string);
}

// Create or update contact from ticket data (called when ticket is created)
export async function ensureContactFromTicket(data: {
  name: string;
  email: string;
  phone?: string;
}): Promise<Contact> {
  const existing = await findContactByEmail(data.email);

  if (existing) {
    // Update last contact time and potentially merge data
    const updates: Partial<Contact> = {
      lastContactAt: new Date().toISOString(),
    };

    // Update name if it's more complete
    if (data.name && data.name.length > (existing.name?.length || 0)) {
      updates.name = data.name;
    }

    // Add phone if not already set
    if (data.phone && !existing.phone) {
      updates.phone = data.phone;
    }

    return updateContact(existing.id, updates) as Promise<Contact>;
  }

  // Create new contact
  return createContact({
    name: data.name,
    email: data.email,
    phone: data.phone,
  });
}

// Update last contact timestamp
export async function updateLastContact(email: string): Promise<void> {
  const contact = await findContactByEmail(email);
  if (contact) {
    await kv.hset(`contact:${contact.id}`, {
      lastContactAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

// Get ticket count for a contact
export async function getContactTicketCount(email: string): Promise<number> {
  const ticketIds: string[] = await kv.smembers(`tickets:email:${email.toLowerCase()}`);
  return ticketIds.length;
}

// Get all contacts with their ticket counts
export async function getAllContactsWithTicketCount(): Promise<Array<Contact & { ticketCount: number }>> {
  const contacts = await getAllContacts();

  const contactsWithCount = await Promise.all(
    contacts.map(async (contact) => {
      const ticketCount = await getContactTicketCount(contact.email);
      return { ...contact, ticketCount };
    })
  );

  return contactsWithCount;
}

// Search contacts by name or email
export async function searchContacts(query: string): Promise<Contact[]> {
  const contacts = await getAllContacts();
  const lowerQuery = query.toLowerCase();

  return contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(lowerQuery) ||
      c.email.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query)
  );
}
