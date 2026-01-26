import { NextRequest, NextResponse } from 'next/server';
import { getAllArticleAnalytics, getTotalSiteViews, getPopularArticles } from '@/lib/analytics';

function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth || !basicAuth.startsWith('Basic ')) {
    return false;
  }
  const credentials = Buffer.from(basicAuth.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [articles, totalViews, popular] = await Promise.all([
      getAllArticleAnalytics(),
      getTotalSiteViews(),
      getPopularArticles(10),
    ]);

    // Sort by total views descending
    articles.sort((a, b) => b.totalViews - a.totalViews);

    return NextResponse.json({
      articles,
      totalViews,
      popular,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
