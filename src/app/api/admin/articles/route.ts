import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function GET(req: NextRequest) {
  // Check for session cookie
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    // Ensure articles are sorted by createdAt, newest first for consistency
    articles.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Failed to read articles from KV in admin API:', error);
    return NextResponse.json({ message: 'Failed to load articles.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Check for session cookie
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newArticleData = await req.json();
    // @ts-ignore crypto is available in Vercel Edge Runtime
    const newId = crypto.randomUUID(); // Generate a unique ID for the new article

    const articleWithId = {
      id: newId,
      ...newArticleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.hmset(`article:${newId}`, articleWithId);
    await kv.sadd('articles:ids', newId);

    return NextResponse.json(articleWithId, { status: 201 });
  } catch (error) {
    console.error('Failed to create article in KV:', error);
    return NextResponse.json({ message: 'Failed to create article.' }, { status: 500 });
  }
}
