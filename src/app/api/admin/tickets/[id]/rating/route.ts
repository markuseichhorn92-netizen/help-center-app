import { NextRequest, NextResponse } from 'next/server';
import { getTicketRating } from '@/lib/ticket-rating';

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
    const rating = await getTicketRating(ticketId);

    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Get rating error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
