import { NextRequest, NextResponse } from 'next/server';
import {
  getAllContactsWithTicketCount,
  createContact,
  searchContacts,
} from '@/lib/contacts';
import { requireAdmin } from '@/lib/admin-auth';

// GET /api/admin/contacts - Get all contacts
export async function GET(req: NextRequest) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (query) {
      const contacts = await searchContacts(query);
      return NextResponse.json(contacts);
    }

    const contacts = await getAllContactsWithTicketCount();
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/contacts - Create new contact
export async function POST(req: NextRequest) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { name, email, phone, notes, tags } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name und E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    const contact = await createContact({
      name,
      email,
      phone,
      notes,
      tags,
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
