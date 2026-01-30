import { NextRequest, NextResponse } from 'next/server';
import { getRatingStats, getAllRatingsWithContact, TicketRatingWithContact } from '@/lib/ticket-rating';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface CSATTrendPoint {
  date: string;
  avgRating: number;
  count: number;
}

// GET /api/admin/csat - Get CSAT statistics and trends
export async function GET(req: NextRequest) {
  // Check session cookie
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    if (type === 'stats') {
      const stats = await getRatingStats();
      return NextResponse.json({ stats });
    }

    if (type === 'recent') {
      const limit = parseInt(searchParams.get('limit') || '20');
      const ratings = await getAllRatingsWithContact(limit);
      return NextResponse.json({ ratings });
    }

    if (type === 'trend') {
      const days = parseInt(searchParams.get('days') || '30');
      const trend = await getCSATTrend(days);
      return NextResponse.json({ trend });
    }

    // Default: get all data
    const [stats, ratings, trend] = await Promise.all([
      getRatingStats(),
      getAllRatingsWithContact(10),
      getCSATTrend(30),
    ]);

    return NextResponse.json({
      stats,
      ratings,
      trend,
    });
  } catch (error) {
    console.error('CSAT API error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der CSAT-Daten' },
      { status: 500 }
    );
  }
}

// Get CSAT trend for the last N days
async function getCSATTrend(days: number): Promise<CSATTrendPoint[]> {
  const ratings = await getAllRatingsWithContact(500); // Get more for trend analysis
  
  // Group by date
  const byDate = new Map<string, { sum: number; count: number }>();
  
  for (const rating of ratings) {
    const date = rating.createdAt.split('T')[0];
    const existing = byDate.get(date) || { sum: 0, count: 0 };
    existing.sum += rating.rating;
    existing.count += 1;
    byDate.set(date, existing);
  }

  // Generate last N days
  const trend: CSATTrendPoint[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const data = byDate.get(dateStr);
    trend.push({
      date: dateStr,
      avgRating: data ? Math.round((data.sum / data.count) * 10) / 10 : 0,
      count: data?.count || 0,
    });
  }

  return trend;
}
