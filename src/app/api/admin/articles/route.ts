import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

// Helper function to check authentication
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth) {
    return false;
  }
  const authValue = basicAuth.split(' ')[1];
  const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  return user === ADMIN_USER && password === ADMIN_PASS;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
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
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
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
