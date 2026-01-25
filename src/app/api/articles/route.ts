import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function GET(req: NextRequest) {
  try {
    const articleIds: string[] = await kv.smembers('articles:ids');
    if (articleIds.length === 0) {
      return NextResponse.json([]);
    }

    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const article = await kv.hgetall(`article:${id}`);
        return { id, ...article };
      })
    );

    const publishedArticles = articles.filter((article: any) => article.published);

    // Ensure articles are sorted by createdAt, newest first for consistency
    publishedArticles.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(publishedArticles);
  } catch (error) {
    console.error('Failed to read articles from KV:', error);
    return NextResponse.json({ message: 'Failed to load articles.' }, { status: 500 });
  }
}
