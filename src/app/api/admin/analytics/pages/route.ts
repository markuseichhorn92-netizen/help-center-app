import { NextRequest, NextResponse } from 'next/server';
import { getPageStats, getRecentPageViews } from '@/lib/page-analytics';
import { requireAdmin } from '@/lib/admin-auth';

// GET: Get page view statistics
export async function GET(req: NextRequest) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const includeRecent = searchParams.get('includeRecent') === 'true';

    const stats = await getPageStats(days);

    let recentViews;
    if (includeRecent) {
      recentViews = await getRecentPageViews(30);
    }

    return NextResponse.json({
      ...stats,
      recentViews: includeRecent ? recentViews : undefined,
    });
  } catch (error) {
    console.error('Page stats error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
