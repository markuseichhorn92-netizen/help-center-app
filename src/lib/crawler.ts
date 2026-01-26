import * as cheerio from 'cheerio';
import { saveKnowledgeEntry, updateKnowledgeEntry, getKnowledgeEntryByUrl } from './knowledge-base';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
  status: 'success' | 'error';
  error?: string;
  skipped?: boolean;
}

// Extract clean text from HTML
function extractText($: cheerio.CheerioAPI): string {
  // Remove script, style, nav, footer, and other non-content elements
  $('script, style, nav, footer, header, iframe, noscript').remove();
  
  // Get main content (prioritize main, article, or body)
  const mainContent = $('main, article, [role="main"], .content, #content').first();
  const textContent = mainContent.length > 0 ? mainContent.text() : $('body').text();
  
  // Clean up whitespace
  return textContent
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

// Extract metadata
function extractMetadata($: cheerio.CheerioAPI): {
  title: string;
  description?: string;
  keywords?: string[];
} {
  const title = 
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    $('h1').first().text() ||
    'Unbekannter Titel';

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');

  const keywordsStr = $('meta[name="keywords"]').attr('content');
  const keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()) : [];

  return { title, description, keywords };
}

// Crawl a single URL
export async function crawlUrl(url: string, skipExisting: boolean = false): Promise<CrawlResult> {
  try {
    // Check if entry already exists
    const existingEntry = await getKnowledgeEntryByUrl(url);

    // Skip if already exists and skipExisting is enabled
    if (existingEntry && skipExisting) {
      console.log(`Skipped (already exists): ${url}`);
      return {
        url,
        title: existingEntry.title,
        content: existingEntry.content.substring(0, 500) + '...',
        description: existingEntry.description,
        keywords: existingEntry.keywords,
        status: 'success',
        skipped: true,
      };
    }

    console.log(`Crawling: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HelpCenterBot/1.0 (Knowledge Base Crawler)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const { title, description, keywords } = extractMetadata($);
    const content = extractText($);

    if (existingEntry) {
      await updateKnowledgeEntry(url, { title, content, description, keywords });
      console.log(`Updated: ${url}`);
    } else {
      await saveKnowledgeEntry({ url, title, content, description, keywords });
      console.log(`Created: ${url}`);
    }

    return {
      url,
      title,
      content: content.substring(0, 500) + '...',
      description,
      keywords,
      status: 'success',
    };
  } catch (error: any) {
    console.error(`Failed to crawl ${url}:`, error);
    return {
      url,
      title: '',
      content: '',
      status: 'error',
      error: error.message,
    };
  }
}

// Crawl multiple URLs
export async function crawlUrls(urls: string[], skipExisting: boolean = false): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];

  for (const url of urls) {
    const result = await crawlUrl(url, skipExisting);
    results.push(result);

    // Add delay only if we actually crawled (not skipped)
    if (!result.skipped) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Discover URLs from a sitemap
export async function crawlSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const urls: string[] = [];
    $('url > loc').each((_, elem) => {
      const url = $(elem).text().trim();
      if (url) {
        urls.push(url);
      }
    });

    console.log(`Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error: any) {
    console.error('Failed to crawl sitemap:', error);
    return [];
  }
}

// Crawl website starting from homepage
export async function crawlWebsite(startUrl: string, maxPages: number = 20, skipExisting: boolean = false): Promise<CrawlResult[]> {
  const visited = new Set<string>();
  const toVisit = [startUrl];
  const results: CrawlResult[] = [];

  const baseUrl = new URL(startUrl);
  const baseDomain = baseUrl.hostname;

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift()!;

    // Normalize URL (remove trailing slash, hash, etc.)
    const normalizedUrl = normalizeUrl(url);
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    const result = await crawlUrl(normalizedUrl, skipExisting);
    results.push(result);

    // Extract links from the page (if successful and not skipped)
    if (result.status === 'success') {
      try {
        // If skipped, we need to fetch the page to get links
        const response = await fetch(normalizedUrl);
        const html = await response.text();
        const $ = cheerio.load(html);

        $('a[href]').each((_, elem) => {
          const href = $(elem).attr('href');
          if (!href) return;

          try {
            const linkUrl = new URL(href, normalizedUrl);

            // Only follow links on the same domain, skip anchors, skip common non-content URLs
            if (
              linkUrl.hostname === baseDomain &&
              !visited.has(normalizeUrl(linkUrl.href)) &&
              !linkUrl.href.includes('#') &&
              !linkUrl.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|xml|json)$/i)
            ) {
              toVisit.push(linkUrl.href);
            }
          } catch {
            // Invalid URL, skip
          }
        });
      } catch (error) {
        console.error(`Failed to extract links from ${normalizedUrl}`);
      }
    }

    // Add delay only if we actually crawled (not skipped)
    if (!result.skipped) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Normalize URL for deduplication
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, hash, and common tracking params
    let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    normalized = normalized.replace(/\/+$/, ''); // Remove trailing slashes
    return normalized || url;
  } catch {
    return url;
  }
}
