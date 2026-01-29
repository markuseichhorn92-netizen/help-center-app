import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface SearchLog {
  id: string;
  query: string;
  resultsCount: number;
  timestamp: string;
  sessionId?: string;
}

export interface SearchStats {
  totalSearches: number;
  uniqueQueries: number;
  topQueries: { query: string; count: number }[];
  noResultQueries: { query: string; count: number }[];
  searchesByDay: { date: string; count: number }[];
}

// Log a search query
export async function logSearch(query: string, resultsCount: number, sessionId?: string): Promise<void> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || normalizedQuery.length < 2) return;

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const dateKey = timestamp.split('T')[0];

  // Store individual search log (keep last 1000)
  const log: SearchLog = { id, query: normalizedQuery, resultsCount, timestamp, sessionId };
  await kv.lpush('search:logs', JSON.stringify(log));
  await kv.ltrim('search:logs', 0, 999);

  // Increment query counter
  await kv.zincrby('search:queries', 1, normalizedQuery);

  // Track no-result queries separately
  if (resultsCount === 0) {
    await kv.zincrby('search:no-results', 1, normalizedQuery);
  }

  // Increment daily counter
  await kv.hincrby('search:daily', dateKey, 1);

  // Increment total counter
  await kv.incr('search:total');
}

// Get search statistics
export async function getSearchStats(days: number = 30): Promise<SearchStats> {
  // Get total searches
  const totalSearches = await kv.get<number>('search:total') || 0;

  // Get top queries
  const topQueriesRaw = await kv.zrange('search:queries', 0, 9, { rev: true, withScores: true });
  const topQueries: { query: string; count: number }[] = [];
  for (let i = 0; i < topQueriesRaw.length; i += 2) {
    topQueries.push({
      query: topQueriesRaw[i] as string,
      count: topQueriesRaw[i + 1] as number,
    });
  }

  // Get no-result queries
  const noResultsRaw = await kv.zrange('search:no-results', 0, 9, { rev: true, withScores: true });
  const noResultQueries: { query: string; count: number }[] = [];
  for (let i = 0; i < noResultsRaw.length; i += 2) {
    noResultQueries.push({
      query: noResultsRaw[i] as string,
      count: noResultsRaw[i + 1] as number,
    });
  }

  // Get unique query count
  const uniqueQueries = await kv.zcard('search:queries') || 0;

  // Get daily counts for the specified period
  const dailyCounts = await kv.hgetall('search:daily') || {};
  const now = new Date();
  const searchesByDay: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    searchesByDay.push({
      date: dateStr,
      count: Number(dailyCounts[dateStr]) || 0,
    });
  }

  return {
    totalSearches,
    uniqueQueries,
    topQueries,
    noResultQueries,
    searchesByDay,
  };
}

// Get recent search logs
export async function getRecentSearches(limit: number = 50): Promise<SearchLog[]> {
  const logs = await kv.lrange('search:logs', 0, limit - 1);
  return logs.map(log => typeof log === 'string' ? JSON.parse(log) : log);
}
