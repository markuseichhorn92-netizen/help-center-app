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

// The articles are now hardcoded to avoid filesystem access issues on Vercel.
const oldArticles = [
  {
    "id": "1",
    "title": "Welcome to the Help Center",
    "content": "<p>This is the first article in your new help center. You can edit or delete it from the admin panel.</p>",
    "published": true,
    "createdAt": "2026-01-25T10:00:00Z",
    "updatedAt": "2026-01-25T10:00:00Z"
  },
  {
    "id": "2",
    "title": "How to use the Admin Panel",
    "content": "<p>Navigate to the <code>/admin</code> path to access the administration panel. Here you can manage your articles.</p>",
    "published": true,
    "createdAt": "2026-01-25T10:05:00Z",
    "updatedAt": "2026-01-25T10:05:00Z"
  }
];

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    let migratedCount = 0;
    for (const article of oldArticles) {
      const articleId = article.id;
      // Check if article already exists in KV to prevent duplicates on re-runs
      const existingArticle = await kv.hgetall(`article:${articleId}`);
      if (!existingArticle || Object.keys(existingArticle).length === 0) {
        // @ts-ignore
        await kv.hmset(`article:${articleId}`, article);
        await kv.sadd('articles:ids', articleId);
        migratedCount++;
      }
    }

    return NextResponse.json({ message: `Migration complete. ${migratedCount} new articles migrated.`, totalArticlesInKV: await kv.scard('articles:ids') });
  } catch (error) {
    console.error('Failed to migrate articles:', error);
    return NextResponse.json({ message: 'Migration failed.' }, { status: 500 });
  }
}
