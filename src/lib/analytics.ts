import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface ArticleAnalytics {
  articleId: string;
  totalViews: number;
  dailyViews: Record<string, number>;
}

export interface AnalyticsSummary {
  articleId: string;
  title?: string;
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Get date N days ago in YYYY-MM-DD format
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Increment view count for an article
export async function trackArticleView(articleId: string): Promise<void> {
  const today = getTodayDate();

  // Increment total views
  await kv.incr(`article:${articleId}:views:total`);

  // Increment daily views (using sorted set with date as member and count as score)
  await kv.zincrby(`article:${articleId}:views:daily`, 1, today);

  // Update popular articles ranking
  await kv.zincrby('analytics:popular', 1, articleId);
}

// Get total views for an article
export async function getArticleTotalViews(articleId: string): Promise<number> {
  const views = await kv.get(`article:${articleId}:views:total`);
  return (views as number) || 0;
}

// Get daily views for an article within a date range
export async function getArticleDailyViews(
  articleId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const allDaily = await kv.zrange(`article:${articleId}:views:daily`, 0, -1, { withScores: true });

  const result: Record<string, number> = {};

  if (allDaily && Array.isArray(allDaily)) {
    for (let i = 0; i < allDaily.length; i += 2) {
      const date = allDaily[i] as string;
      const count = allDaily[i + 1] as number;

      if (date >= startDate && date <= endDate) {
        result[date] = count;
      }
    }
  }

  return result;
}

// Get views for an article in a time period
export async function getArticleViewsInPeriod(
  articleId: string,
  days: number
): Promise<number> {
  const startDate = getDateDaysAgo(days);
  const endDate = getTodayDate();
  const dailyViews = await getArticleDailyViews(articleId, startDate, endDate);

  return Object.values(dailyViews).reduce((sum, count) => sum + count, 0);
}

// Get analytics summary for an article
export async function getArticleAnalyticsSummary(
  articleId: string,
  title?: string
): Promise<AnalyticsSummary> {
  const [totalViews, viewsToday, viewsThisWeek, viewsThisMonth] = await Promise.all([
    getArticleTotalViews(articleId),
    getArticleViewsInPeriod(articleId, 0), // Today only
    getArticleViewsInPeriod(articleId, 7),
    getArticleViewsInPeriod(articleId, 30),
  ]);

  return {
    articleId,
    title,
    totalViews,
    viewsToday,
    viewsThisWeek,
    viewsThisMonth,
  };
}

// Get top N popular articles
export async function getPopularArticles(limit: number = 10): Promise<{ articleId: string; views: number }[]> {
  const popular = await kv.zrange('analytics:popular', 0, limit - 1, { withScores: true, rev: true });

  const result: { articleId: string; views: number }[] = [];

  if (popular && Array.isArray(popular)) {
    for (let i = 0; i < popular.length; i += 2) {
      result.push({
        articleId: popular[i] as string,
        views: popular[i + 1] as number,
      });
    }
  }

  return result;
}

// Get analytics for all articles
export async function getAllArticleAnalytics(): Promise<AnalyticsSummary[]> {
  // Get all article IDs
  const articleIds = await kv.smembers('articles:ids');

  if (!articleIds || articleIds.length === 0) {
    return [];
  }

  // Get analytics for each article
  const analyticsPromises = articleIds.map(async (id) => {
    const article = await kv.hgetall(`article:${id}`);
    const title = article && typeof article === 'object' && 'title' in article
      ? (article.title as string)
      : undefined;

    return getArticleAnalyticsSummary(id as string, title);
  });

  return Promise.all(analyticsPromises);
}

// Get total views across all articles
export async function getTotalSiteViews(): Promise<number> {
  const popular = await kv.zrange('analytics:popular', 0, -1, { withScores: true });

  if (!popular || !Array.isArray(popular)) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < popular.length; i += 2) {
    total += popular[i] as number;
  }

  return total;
}

// Clean up old daily views (older than 90 days)
export async function cleanupOldAnalytics(): Promise<void> {
  const cutoffDate = getDateDaysAgo(90);
  const articleIds = await kv.smembers('articles:ids');

  if (!articleIds || articleIds.length === 0) {
    return;
  }

  for (const id of articleIds) {
    // Remove entries older than cutoff from daily views
    const allDaily = await kv.zrange(`article:${id}:views:daily`, 0, -1, { withScores: true });

    if (allDaily && Array.isArray(allDaily)) {
      for (let i = 0; i < allDaily.length; i += 2) {
        const date = allDaily[i] as string;
        if (date < cutoffDate) {
          await kv.zrem(`article:${id}:views:daily`, date);
        }
      }
    }
  }
}
