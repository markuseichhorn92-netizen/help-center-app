import { NextRequest, NextResponse } from 'next/server';
import { getAllArticleAnalytics, getTotalSiteViews, getPopularArticles } from '@/lib/analytics';
import { getAllArticleFeedback } from '@/lib/feedback';

export async function GET(req: NextRequest) {
  // Check for session cookie (set by login page)
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [articles, totalViews, popular, feedback] = await Promise.all([
      getAllArticleAnalytics(),
      getTotalSiteViews(),
      getPopularArticles(10),
      getAllArticleFeedback(),
    ]);

    // Merge feedback data into articles
    const articlesWithFeedback = articles.map(article => {
      const articleFeedback = feedback.find(f => f.articleId === article.articleId);
      return {
        ...article,
        helpful: articleFeedback?.helpful || 0,
        notHelpful: articleFeedback?.notHelpful || 0,
        totalFeedback: articleFeedback?.total || 0,
        helpfulPercent: articleFeedback?.helpfulPercent || 0,
      };
    });

    // Sort by total views descending
    articlesWithFeedback.sort((a, b) => b.totalViews - a.totalViews);

    // Calculate feedback totals
    const totalHelpful = feedback.reduce((sum, f) => sum + f.helpful, 0);
    const totalNotHelpful = feedback.reduce((sum, f) => sum + f.notHelpful, 0);
    const totalFeedbackVotes = totalHelpful + totalNotHelpful;
    const overallHelpfulPercent = totalFeedbackVotes > 0
      ? Math.round((totalHelpful / totalFeedbackVotes) * 100)
      : 0;

    return NextResponse.json({
      articles: articlesWithFeedback,
      totalViews,
      popular,
      feedback: {
        totalHelpful,
        totalNotHelpful,
        totalVotes: totalFeedbackVotes,
        overallHelpfulPercent,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
