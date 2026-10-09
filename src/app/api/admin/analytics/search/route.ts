import { NextRequest, NextResponse } from 'next/server';
import { getSearchStats, getRecentSearches } from '@/lib/search-analytics';
import { requireAdmin } from '@/lib/admin-auth';

// GET: Get search analytics
export async function GET(req: NextRequest) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const includeRecent = searchParams.get('includeRecent') === 'true';

    const stats = await getSearchStats(days);

    let recentSearches;
    if (includeRecent) {
      recentSearches = await getRecentSearches(20);
    }

    return NextResponse.json({
      ...stats,
      recentSearches: includeRecent ? recentSearches : undefined,
    });
  } catch (error) {
    console.error('Search stats error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
