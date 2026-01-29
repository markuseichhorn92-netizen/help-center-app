import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';
import { logSearch } from '@/lib/search-analytics';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

interface Article {
  id: string;
  title: string;
  content: string;
  category?: string;
  published: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  category?: string;
  excerpt: string;
  matchType: 'title' | 'content';
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Generate excerpt around the match
function generateExcerpt(content: string, query: string, maxLength: number = 150): string {
  const plainText = stripHtml(content);
  const lowerText = plainText.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return plainText.slice(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }

  // Find start and end positions for excerpt
  const start = Math.max(0, index - 50);
  const end = Math.min(plainText.length, index + query.length + 100);

  let excerpt = plainText.slice(start, end);

  // Add ellipsis if needed
  if (start > 0) excerpt = '...' + excerpt;
  if (end < plainText.length) excerpt = excerpt + '...';

  return excerpt;
}

// Highlight matches in text
function highlightMatches(text: string, query: string): string {
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q')?.trim() || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Get all article IDs
    const articleIds = await kv.smembers('articles:ids');

    if (!articleIds || articleIds.length === 0) {
      return NextResponse.json([]);
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search through all articles
    for (const id of articleIds) {
      const article = await kv.hgetall(`article:${id}`) as unknown as Article;

      if (!article || !article.published) continue;

      const titleMatch = article.title.toLowerCase().includes(lowerQuery);
      const contentMatch = stripHtml(article.content).toLowerCase().includes(lowerQuery);

      if (titleMatch || contentMatch) {
        results.push({
          id: article.id,
          title: highlightMatches(article.title, query),
          category: article.category,
          excerpt: highlightMatches(generateExcerpt(article.content, query), query),
          matchType: titleMatch ? 'title' : 'content',
        });
      }
    }

    // Sort: title matches first, then by title alphabetically
    results.sort((a, b) => {
      if (a.matchType !== b.matchType) {
        return a.matchType === 'title' ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });

    const finalResults = results.slice(0, limit);

    // Log search query (async, don't wait)
    logSearch(query, finalResults.length).catch(console.error);

    return NextResponse.json(finalResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
