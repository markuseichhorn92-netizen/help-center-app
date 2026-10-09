import { NextRequest, NextResponse } from 'next/server';
import { getTicket, setTicketCategory } from '@/lib/tickets';
import { rememberSender } from '@/lib/mail-classifier-io';
import { requireAdmin } from '@/lib/admin-auth';

// Admin sortiert ein Ticket um ("Ist Kundenanfrage" / "Ist Sonstiges"), Absender optional merken
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const { category, remember } = await req.json();
    if (category !== 'kundenanfrage' && category !== 'sonstiges') {
      return NextResponse.json({ message: 'Ungültige Kategorie.' }, { status: 400 });
    }

    const current = await getTicket(id);
    if (!current) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    const reason = category === 'kundenanfrage' ? 'Manuell als Kundenanfrage markiert' : 'Manuell als Sonstiges markiert';
    const ticket = await setTicketCategory(id, category, reason);
    if (remember === true && current.customerEmail) {
      await rememberSender(current.customerEmail, category);
    }
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to set ticket category:', error);
    return NextResponse.json({ message: 'Fehler beim Umsortieren.' }, { status: 500 });
  }
}
