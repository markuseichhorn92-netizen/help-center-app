'use client';

import { useState, useEffect } from 'react';

interface RatingStats {
  totalRatings: number;
  avgRating: number;
  distribution: { [key: number]: number };
}

interface TrendPoint {
  date: string;
  avgRating: number;
  count: number;
}

interface RecentRating {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  ticketSubject?: string;
  customerName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

interface CSATData {
  stats: RatingStats;
  ratings: RecentRating[];
  trend: TrendPoint[];
}

export default function CSATWidget() {
  const [data, setData] = useState<CSATData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/csat');
        if (!res.ok) throw new Error('Fehler beim Laden');
        const csatData = await res.json();
        setData(csatData);
      } catch (err) {
        setError('Fehler beim Laden der CSAT-Daten');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
        <div className="animate-pulse">
          <div className="h-6 bg-apple-gray-100 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-apple-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
        <p className="text-red-500">{error || 'Keine Daten verfügbar'}</p>
      </div>
    );
  }

  const { stats, trend, ratings } = data;
  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  // Calculate trend (compare last 7 days vs previous 7 days)
  const last7Days = trend.slice(-7);
  const previous7Days = trend.slice(-14, -7);
  const last7Avg = last7Days.filter(d => d.count > 0).reduce((sum, d) => sum + d.avgRating, 0) / 
    (last7Days.filter(d => d.count > 0).length || 1);
  const prev7Avg = previous7Days.filter(d => d.count > 0).reduce((sum, d) => sum + d.avgRating, 0) / 
    (previous7Days.filter(d => d.count > 0).length || 1);
  const trendChange = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg * 100) : 0;

  // Star color based on rating
  const getStarColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 2.5) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-apple-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h2 className="font-semibold text-apple-gray-600">Kundenzufriedenheit (CSAT)</h2>
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className={`text-4xl font-bold ${getStarColor(stats.avgRating)}`}>
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(stats.avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            <div className="text-xs text-apple-gray-400 mt-2">
              {stats.totalRatings} Bewertung{stats.totalRatings !== 1 ? 'en' : ''}
            </div>
          </div>

          {/* Trend */}
          <div className="text-right">
            <div className={`flex items-center gap-1 ${
              trendChange > 0 ? 'text-green-600' : trendChange < 0 ? 'text-red-600' : 'text-apple-gray-400'
            }`}>
              {trendChange !== 0 && (
                <svg
                  className={`w-4 h-4 ${trendChange < 0 ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              <span className="text-sm font-medium">
                {trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-apple-gray-400">vs. letzte Woche</div>
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating] || 0;
            const percentage = maxCount > 0 ? (count / stats.totalRatings) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 w-10">
                  <span className="text-xs text-apple-gray-500">{rating}</span>
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="flex-1 bg-apple-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rating >= 4 ? 'bg-green-400' : rating >= 3 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-apple-gray-400 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Mini Trend Chart */}
        {trend.length > 0 && (
          <div className="mt-6 pt-4 border-t border-apple-gray-100">
            <div className="text-xs text-apple-gray-400 mb-2">Letzte 14 Tage</div>
            <div className="flex items-end gap-1 h-16">
              {trend.slice(-14).map((point, index) => {
                const height = point.avgRating > 0 ? (point.avgRating / 5) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        point.avgRating >= 4 ? 'bg-green-400' :
                        point.avgRating >= 3 ? 'bg-yellow-400' :
                        point.avgRating > 0 ? 'bg-red-400' : 'bg-apple-gray-200'
                      }`}
                      style={{ height: `${height}%`, minHeight: point.count > 0 ? '4px' : '0' }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-apple-gray-600 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {new Date(point.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      : {point.avgRating > 0 ? point.avgRating.toFixed(1) : '—'} ({point.count})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Ratings */}
      {ratings.length > 0 && (
        <div className="border-t border-apple-gray-100 divide-y divide-apple-gray-100">
          <div className="px-5 py-3 bg-apple-gray-50">
            <span className="text-xs font-medium text-apple-gray-500">Letzte Bewertungen</span>
          </div>
          {ratings.slice(0, 3).map((rating) => (
            <div key={rating.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-3 h-3 ${star <= rating.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-apple-gray-400">{rating.ticketNumber}</span>
                </div>
                <span className="text-xs text-apple-gray-400">
                  {new Date(rating.createdAt).toLocaleDateString('de-DE')}
                </span>
              </div>
              {rating.comment && (
                <p className="text-xs text-apple-gray-500 mt-1 line-clamp-1">{rating.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Ratings */}
      {stats.totalRatings === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="w-12 h-12 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-apple-gray-500">Noch keine Bewertungen</p>
        </div>
      )}
    </div>
  );
}
