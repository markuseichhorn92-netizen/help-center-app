import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface PageView {
  path: string;
  referrer?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  timestamp: string;
}

export interface PageStats {
  totalViews: number;
  uniquePaths: number;
  viewsByDay: { date: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  deviceStats: { device: string; count: number }[];
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
}

// Detect device type from user agent (no fingerprinting)
export function detectDevice(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Clean referrer (remove query params, keep domain)
function cleanReferrer(referrer: string | undefined): string {
  if (!referrer) return 'direkt';
  try {
    const url = new URL(referrer);
    // Don't track internal referrers
    if (url.hostname.includes('vercel.app') || url.hostname.includes('localhost')) {
      return 'direkt';
    }
    return url.hostname.replace('www.', '');
  } catch {
    return 'direkt';
  }
}

// Log a page view (anonymous, no cookies)
export async function logPageView(
  path: string,
  userAgent: string,
  referrer?: string
): Promise<void> {
  // Skip admin pages and API routes
  if (path.startsWith('/admin') || path.startsWith('/api')) return;
  
  const timestamp = new Date().toISOString();
  const dateKey = timestamp.split('T')[0];
  const device = detectDevice(userAgent);
  const cleanedReferrer = cleanReferrer(referrer);

  // Increment total counter
  await kv.incr('pageviews:total');

  // Increment daily counter
  await kv.hincrby('pageviews:daily', dateKey, 1);

  // Increment page counter
  await kv.zincrby('pageviews:pages', 1, path);

  // Increment referrer counter (only external)
  if (cleanedReferrer !== 'direkt') {
    await kv.zincrby('pageviews:referrers', 1, cleanedReferrer);
  }

  // Increment device counter
  await kv.hincrby('pageviews:devices', device, 1);

  // Store in recent views list (keep last 500)
  const view: PageView = { path, referrer: cleanedReferrer, device, timestamp };
  await kv.lpush('pageviews:recent', JSON.stringify(view));
  await kv.ltrim('pageviews:recent', 0, 499);
}

// Get page statistics
export async function getPageStats(days: number = 30): Promise<PageStats> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Calculate date boundaries
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get total views
  const totalViews = await kv.get<number>('pageviews:total') || 0;

  // Get unique paths count
  const uniquePaths = await kv.zcard('pageviews:pages') || 0;

  // Get top pages
  const topPagesRaw = await kv.zrange('pageviews:pages', 0, 9, { rev: true, withScores: true });
  const topPages: { path: string; count: number }[] = [];
  for (let i = 0; i < topPagesRaw.length; i += 2) {
    topPages.push({
      path: topPagesRaw[i] as string,
      count: topPagesRaw[i + 1] as number,
    });
  }

  // Get top referrers
  const topReferrersRaw = await kv.zrange('pageviews:referrers', 0, 9, { rev: true, withScores: true });
  const topReferrers: { referrer: string; count: number }[] = [];
  for (let i = 0; i < topReferrersRaw.length; i += 2) {
    topReferrers.push({
      referrer: topReferrersRaw[i] as string,
      count: topReferrersRaw[i + 1] as number,
    });
  }

  // Get device stats
  const deviceData = await kv.hgetall('pageviews:devices') || {};
  const deviceStats = Object.entries(deviceData).map(([device, count]) => ({
    device: device === 'desktop' ? 'Desktop' : device === 'mobile' ? 'Mobil' : 'Tablet',
    count: Number(count),
  }));

  // Get daily counts
  const dailyCounts = await kv.hgetall('pageviews:daily') || {};
  const viewsByDay: { date: string; count: number }[] = [];
  let viewsToday = 0;
  let viewsThisWeek = 0;
  let viewsThisMonth = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const count = Number(dailyCounts[dateStr]) || 0;
    
    viewsByDay.push({ date: dateStr, count });
    
    if (dateStr === today) viewsToday = count;
    if (dateStr >= weekAgo) viewsThisWeek += count;
    if (dateStr >= monthAgo) viewsThisMonth += count;
  }

  return {
    totalViews,
    uniquePaths,
    viewsByDay,
    topPages,
    topReferrers,
    deviceStats,
    viewsToday,
    viewsThisWeek,
    viewsThisMonth,
  };
}

// Get recent page views
export async function getRecentPageViews(limit: number = 50): Promise<PageView[]> {
  const views = await kv.lrange('pageviews:recent', 0, limit - 1);
  return views.map(v => typeof v === 'string' ? JSON.parse(v) : v);
}
