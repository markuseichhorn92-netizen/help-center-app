import { NextRequest, NextResponse } from 'next/server';
import { crawlUrls, crawlSitemap, crawlWebsite } from '@/lib/crawler';
import { getAllKnowledgeEntries, deleteKnowledgeEntry } from '@/lib/knowledge-base';
import { requireAdmin } from '@/lib/admin-auth';

// POST - Manual crawl
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { action, urls, sitemapUrl, startUrl, maxPages, skipExisting } = body;

    let results;

    switch (action) {
      case 'crawl_urls':
        if (!urls || !Array.isArray(urls)) {
          return NextResponse.json({ error: 'URLs array required' }, { status: 400 });
        }
        results = await crawlUrls(urls, skipExisting || false);
        break;

      case 'crawl_sitemap':
        if (!sitemapUrl) {
          return NextResponse.json({ error: 'Sitemap URL required' }, { status: 400 });
        }
        const sitemapUrls = await crawlSitemap(sitemapUrl);
        results = await crawlUrls(sitemapUrls, skipExisting || false);
        break;

      case 'crawl_website':
        if (!startUrl) {
          return NextResponse.json({ error: 'Start URL required' }, { status: 400 });
        }
        results = await crawlWebsite(startUrl, maxPages || 100, skipExisting || false);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.skipped).length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: 'Crawl completed',
      results: {
        total: results.length,
        success: successCount,
        skipped: skippedCount,
        newOrUpdated: successCount - skippedCount,
        errors: errorCount,
      },
      crawledUrls: results,
    });
  } catch (error: any) {
    console.error('Crawl error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get all knowledge entries
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const entries = await getAllKnowledgeEntries();
    return NextResponse.json({ entries, total: entries.length });
  } catch (error: any) {
    console.error('Failed to get knowledge entries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete knowledge entry
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const success = await deleteKnowledgeEntry(id);

    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Entry deleted' });
  } catch (error: any) {
    console.error('Failed to delete knowledge entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
