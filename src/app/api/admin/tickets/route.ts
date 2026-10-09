import { NextRequest, NextResponse } from 'next/server';
import { getAllTicketsWithUnreadCount } from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const tickets = await getAllTicketsWithUnreadCount();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to load tickets:', error);
    return NextResponse.json({ message: 'Fehler beim Laden der Tickets.' }, { status: 500 });
  }
}
