import { NextRequest, NextResponse } from 'next/server';
import { getTicketSLAStatus } from '@/lib/sla';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: ticketId } = await params;
    const slaStatus = await getTicketSLAStatus(ticketId);

    if (!slaStatus) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ sla: slaStatus });
  } catch (error) {
    console.error('Get SLA status error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
