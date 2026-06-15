import { kv } from './kv';
import { unstable_cache } from 'next/cache';

export interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Read all published articles from KV (uncached).
// Mirrors the original inline logic from /api/articles: load all IDs, then
// fetch each article hash in parallel, keep only published, newest first.
async function getPublishedArticlesUncached(): Promise<Article[]> {
  try {
    const articleIds: string[] = await kv.smembers('articles:ids');
    if (articleIds.length === 0) {
      return [];
    }

    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const article = await kv.hgetall(`article:${id}`);
        return { id, ...article } as unknown as Article;
      })
    );

    const publishedArticles = articles.filter((article) => article.published);

    publishedArticles.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return publishedArticles;
  } catch (error) {
    // Degrade gracefully (e.g. KV unreachable during build-time prerender);
    // ISR will revalidate with real data once KV is available at runtime.
    console.error('Failed to read articles from KV:', error);
    return [];
  }
}

// Cached wrapper: memoizes the ~38 KV round-trips in the Next data cache for
// 60s so only the first request per window pays the cost. Invalidate on write
// with revalidateTag('articles').
export const getPublishedArticles = unstable_cache(
  getPublishedArticlesUncached,
  ['published-articles'],
  { revalidate: 60, tags: ['articles'] }
);
