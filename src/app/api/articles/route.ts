import { NextResponse } from 'next/server';
import { getPublishedArticles } from '@/lib/articles';

export async function GET() {
  try {
    const articles = await getPublishedArticles();
    return NextResponse.json(articles, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to read articles from KV:', error);
    return NextResponse.json({ message: 'Failed to load articles.' }, { status: 500 });
  }
}
