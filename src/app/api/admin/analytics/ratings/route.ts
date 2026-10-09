import { NextRequest, NextResponse } from 'next/server';
import { getRatingStats, getAllRatings, getAllRatingsWithContact, TicketRating, TicketRatingWithContact } from '@/lib/ticket-rating';
import { requireAdmin } from '@/lib/admin-auth';

// GET: Get rating statistics
export async function GET(req: NextRequest) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const includeRecent = searchParams.get('includeRecent') === 'true';
    const includeContact = searchParams.get('includeContact') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Get aggregated stats
    const stats = await getRatingStats();

    // Optionally include recent ratings (with or without contact info)
    let recentRatings: TicketRating[] | TicketRatingWithContact[] = [];
    if (includeRecent) {
      if (includeContact) {
        recentRatings = await getAllRatingsWithContact(limit);
      } else {
        recentRatings = await getAllRatings(limit);
      }
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
