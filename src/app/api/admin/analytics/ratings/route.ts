import { NextRequest, NextResponse } from 'next/server';
import { getRatingStats, getAllRatings, TicketRating } from '@/lib/ticket-rating';

// GET: Get rating statistics
export async function GET(req: NextRequest) {
  // Check authentication
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const includeRecent = searchParams.get('includeRecent') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get aggregated stats
    const stats = await getRatingStats();

    // Optionally include recent ratings
    let recentRatings: TicketRating[] = [];
    if (includeRecent) {
      recentRatings = await getAllRatings(limit);
    }

    return NextResponse.json({
      ...stats,
      recentRatings: includeRecent ? recentRatings : undefined,
    });
  } catch (error) {
    console.error('Rating stats error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
