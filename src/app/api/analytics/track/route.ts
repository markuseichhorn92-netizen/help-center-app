import { NextRequest, NextResponse } from 'next/server';
import { logPageView } from '@/lib/page-analytics';

// POST: Track a page view (anonymous, no cookies)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, referrer } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    // Get user agent from headers
    const userAgent = req.headers.get('user-agent') || '';

    // Log the page view (fire and forget for speed)
    logPageView(path, userAgent, referrer).catch(console.error);

    // Return immediately (don't wait for KV)
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json({ ok: true }); // Don't fail the request
  }
}

// Also support GET with query params (for img pixel fallback)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('p');
  const referrer = searchParams.get('r');

  if (path) {
    const userAgent = req.headers.get('user-agent') || '';
    logPageView(path, userAgent, referrer || undefined).catch(console.error);
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new NextResponse(gif, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
