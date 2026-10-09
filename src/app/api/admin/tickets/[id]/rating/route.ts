import { NextRequest, NextResponse } from 'next/server';
import { getTicketRating } from '@/lib/ticket-rating';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
