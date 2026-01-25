import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() as string;
    
    console.log(`[PUBLIC_DEBUG] req.url: ${req.url}`);
    console.log(`[PUBLIC_DEBUG] url.pathname: ${url.pathname}`);
    console.log(`[PUBLIC_DEBUG] Extracted ID: ${id}`);

    const article = await kv.hgetall(`article:${id}`);

    if (!article || Object.keys(article).length === 0 || !article.published) { // Check if article exists, is not empty and is published
      console.log(`[PUBLIC_DEBUG] Article with ID: ${id} NOT FOUND or not published.`);
      return NextResponse.json({ message: 'Article not found or not published.' }, { status: 404 });
    }

    console.log(`[PUBLIC_DEBUG] Successfully fetched article with ID: ${id}`);
    return NextResponse.json({ id, ...article });
  } catch (error) {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop() as string;
    console.error(`Failed to read article with ID ${id} from KV:`, error);
    return NextResponse.json({ message: 'Failed to load article.' }, { status: 500 });
  }
}
