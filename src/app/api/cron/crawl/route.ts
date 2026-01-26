import { NextRequest, NextResponse } from 'next/server';
import { crawlUrls } from '@/lib/crawler';

// Vercel Cron Job to crawl website periodically
// This endpoint should be called by Vercel Cron (configured in vercel.json)

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled crawl...');

    // Define URLs to crawl (you can also make this dynamic)
    const urlsToCrawl = process.env.CRAWL_URLS?.split(',').map(u => u.trim()) || [
      'https://fit-inn-trier.de',
      'https://fit-inn-trier.de/ueber-uns',
      'https://fit-inn-trier.de/kurse',
      'https://fit-inn-trier.de/preise',
      'https://fit-inn-trier.de/kontakt',
    ];

    console.log(`Crawling ${urlsToCrawl.length} URLs...`);

    const results = await crawlUrls(urlsToCrawl);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Crawl completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Crawl completed',
      results: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      crawledUrls: results.map(r => ({
        url: r.url,
        status: r.status,
        title: r.title,
        error: r.error,
      })),
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', message: error.message },
      { status: 500 }
    );
  }
}
