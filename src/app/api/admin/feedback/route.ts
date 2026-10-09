import { NextRequest, NextResponse } from 'next/server';
import { getAllArticleFeedback, getLowRatedArticles } from '@/lib/feedback';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter');

    if (filter === 'low-rated') {
      const threshold = parseInt(url.searchParams.get('threshold') || '50');
      const lowRated = await getLowRatedArticles(threshold);
      return NextResponse.json({ articles: lowRated });
    }

    const feedback = await getAllArticleFeedback();

    // Calculate overall stats
    const totalVotes = feedback.reduce((sum, f) => sum + f.total, 0);
    const totalHelpful = feedback.reduce((sum, f) => sum + f.helpful, 0);
    const overallHelpfulPercent = totalVotes > 0 ? Math.round((totalHelpful / totalVotes) * 100) : 0;

    return NextResponse.json({
      articles: feedback,
      stats: {
        totalVotes,
        totalHelpful,
        totalNotHelpful: totalVotes - totalHelpful,
        overallHelpfulPercent,
        articlesWithFeedback: feedback.filter(f => f.total > 0).length,
      },
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
