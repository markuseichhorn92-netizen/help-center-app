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
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() as string;
    
    const article = await kv.hgetall(`article:${id}`);

    if (!article || Object.keys(article).length === 0) { // Check if article exists and is not empty
      return NextResponse.json({ message: 'Article not found.' }, { status: 404 });
    }

    return NextResponse.json({ id, ...article });
  } catch (error) {
    console.error(`Failed to read article from KV in admin API:`, error);
    return NextResponse.json({ message: 'Failed to load article.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() as string;
    
    const updatedArticleData = await req.json();
    const existingArticle = await kv.hgetall(`article:${id}`);

    if (!existingArticle || Object.keys(existingArticle).length === 0) {
      return NextResponse.json({ message: 'Article not found.' }, { status: 404 });
    }

    const finalArticleData = {
      ...existingArticle,
      ...updatedArticleData,
      updatedAt: new Date().toISOString(),
      id: id, // Ensure ID remains the same
    };

    await kv.hmset(`article:${id}`, finalArticleData);

    return NextResponse.json(finalArticleData);
  } catch (error) {
    console.error(`Failed to update article in KV:`, error);
    return NextResponse.json({ message: 'Failed to update article.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() as string;
    
    const articleExists = await kv.exists(`article:${id}`);
    if (!articleExists) {
        return NextResponse.json({ message: 'Article not found.' }, { status: 404 });
    }

    await kv.del(`article:${id}`); // Delete the article hash
    await kv.srem('articles:ids', id); // Remove ID from the set

    return NextResponse.json({ message: 'Article deleted successfully.' });
  } catch (error) {
    console.error(`Failed to delete article from KV:`, error);
    return NextResponse.json({ message: 'Failed to delete article.' }, { status: 500 });
  }
}
