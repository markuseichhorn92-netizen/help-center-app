import { NextRequest, NextResponse } from 'next/server';
import { getTicket } from '@/lib/tickets';
import { getAIStatus, setAIStatus } from '@/lib/ai-autoreply';
import { requireAdmin } from '@/lib/admin-auth';

// GET: Get current AI status for a ticket
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const aiStatus = await getAIStatus(id);

    return NextResponse.json({
      ticketId: id,
      aiStatus,
      isEnabled: aiStatus === 'active',
    });
  } catch (error: any) {
    console.error('Failed to get AI status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des KI-Status', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Toggle AI status for a ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const body = await req.json();
    const { action } = body as { action: 'enable' | 'disable' };

    if (!action || !['enable', 'disable'].includes(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion. Verwende "enable" oder "disable".' },
        { status: 400 }
      );
    }

    const newStatus = action === 'enable' ? 'active' : 'disabled';
    await setAIStatus(id, newStatus);

    console.log(`AI status for ticket ${ticket.ticketNumber} changed to ${newStatus}`);

    return NextResponse.json({
      success: true,
      ticketId: id,
      aiStatus: newStatus,
      isEnabled: newStatus === 'active',
    });
  } catch (error: any) {
    console.error('Failed to update AI status:', error);
    return NextResponse.json(
      { error: 'Fehler beim Ändern des KI-Status', details: error.message },
      { status: 500 }
    );
  }
}
