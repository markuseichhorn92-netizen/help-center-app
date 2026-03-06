import { NextRequest, NextResponse } from 'next/server';
import { getAllTicketsWithUnreadCount } from '@/lib/tickets';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allTickets = await getAllTicketsWithUnreadCount();
    // Filter: Nur WhatsApp-Tickets anzeigen (E-Mails werden über Superhuman bearbeitet)
    const tickets = allTickets.filter(t => t.channel === 'whatsapp');
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to load tickets:', error);
    return NextResponse.json({ message: 'Fehler beim Laden der Tickets.' }, { status: 500 });
  }
}
