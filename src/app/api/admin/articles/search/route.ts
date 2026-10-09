import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireAdmin } from '@/lib/admin-auth';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  published: boolean;
}

// GET: Search articles (Admin version - includes unpublished optionally)
export async function GET(req: NextRequest) {
  // Check authentication
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const includeUnpublished = searchParams.get('includeUnpublished') === 'true';

    if (query.length < 2) {
      return NextResponse.json({ articles: [] });
    }

    // Get all article IDs
    const articleIds = await kv.smembers('articles:ids');
    if (!articleIds || articleIds.length === 0) {
      return NextResponse.json({ articles: [] });
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    const results: Array<{
      id: string;
      title: string;
      slug: string;
      category: string;
      excerpt: string;
      matchType: 'title' | 'content';
      score: number;
    }> = [];

    // Search through articles
    for (const id of articleIds) {
      const article = await kv.hgetall(`article:${id}`) as unknown as Article | null;
      if (!article) continue;

      // Skip unpublished unless requested
      if (!includeUnpublished && !article.published) continue;

      const titleLower = article.title.toLowerCase();
      const contentLower = (article.content || '').toLowerCase().replace(/<[^>]*>/g, '');

      let score = 0;
      let matchType: 'title' | 'content' = 'content';
      let matchPosition = -1;

      // Check title matches (higher score)
      for (const term of searchTerms) {
        const titleIndex = titleLower.indexOf(term);
        if (titleIndex !== -1) {
          score += 10;
          matchType = 'title';
          if (matchPosition === -1) matchPosition = titleIndex;
        }

        const contentIndex = contentLower.indexOf(term);
        if (contentIndex !== -1) {
          score += 1;
          if (matchPosition === -1) matchPosition = contentIndex;
        }
      }

      if (score > 0) {
        // Create excerpt
        let excerpt = '';
        const plainContent = contentLower;
        if (matchType === 'content' && matchPosition !== -1) {
          const start = Math.max(0, matchPosition - 30);
          const end = Math.min(plainContent.length, matchPosition + 100);
          excerpt = (start > 0 ? '...' : '') +
            plainContent.slice(start, end) +
            (end < plainContent.length ? '...' : '');
        } else {
          excerpt = plainContent.slice(0, 120) + (plainContent.length > 120 ? '...' : '');
        }

        results.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
          category: article.category,
          excerpt: excerpt.trim(),
          matchType,
          score,
        });
      }
    }

    // Sort by score (highest first) and limit
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({ articles: limitedResults });
  } catch (error) {
    console.error('Article search error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
