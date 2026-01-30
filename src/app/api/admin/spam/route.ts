import { NextRequest, NextResponse } from 'next/server';
import { addToSpamBlacklist, removeFromSpamBlacklist, getSpamBlacklist, markAllTicketsFromEmailAsSpam } from '@/lib/spam';

// GET /api/admin/spam - Get spam blacklist
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const blacklist = await getSpamBlacklist();
    return NextResponse.json({ blacklist });
  } catch (error) {
    console.error('Failed to get spam blacklist:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Spam-Liste' }, { status: 500 });
  }
}

// POST /api/admin/spam - Add email to spam blacklist
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, markExistingTickets } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Add to blacklist
    await addToSpamBlacklist(email, 'Manuell hinzugefügt');

    // Optionally mark all existing tickets from this email as spam
    let ticketsMarked = 0;
    if (markExistingTickets) {
      ticketsMarked = await markAllTicketsFromEmailAsSpam(email, 'E-Mail-Adresse blockiert');
    }

    return NextResponse.json({ 
      success: true, 
      message: `${email} zur Spam-Liste hinzugefügt`,
      ticketsMarked 
    });
  } catch (error) {
    console.error('Failed to add to spam blacklist:', error);
    return NextResponse.json({ error: 'Fehler beim Hinzufügen zur Spam-Liste' }, { status: 500 });
  }
}

// DELETE /api/admin/spam - Remove email from spam blacklist
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    await removeFromSpamBlacklist(email);

    return NextResponse.json({ 
      success: true, 
      message: `${email} von Spam-Liste entfernt` 
    });
  } catch (error) {
    console.error('Failed to remove from spam blacklist:', error);
    return NextResponse.json({ error: 'Fehler beim Entfernen von der Spam-Liste' }, { status: 500 });
  }
}
