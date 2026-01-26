"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface AnalyticsSummary {
  articleId: string;
  title?: string;
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  helpful: number;
  notHelpful: number;
  totalFeedback: number;
  helpfulPercent: number;
}

interface FeedbackTotals {
  totalHelpful: number;
  totalNotHelpful: number;
  totalVotes: number;
  overallHelpfulPercent: number;
}

interface AnalyticsData {
  articles: AnalyticsSummary[];
  totalViews: number;
  popular: { articleId: string; views: number }[];
  feedback: FeedbackTotals;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/analytics', {
          credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const getViewsByFilter = (article: AnalyticsSummary): number => {
    switch (timeFilter) {
      case 'today': return article.viewsToday;
      case 'week': return article.viewsThisWeek;
      case 'month': return article.viewsThisMonth;
      default: return article.totalViews;
    }
  };

  const filteredArticles = data?.articles
    .map(a => ({ ...a, filteredViews: getViewsByFilter(a) }))
    .sort((a, b) => b.filteredViews - a.filteredViews) || [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Analytics werden geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin" className="text-apple-gray-400 hover:text-brand transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-apple-gray-600 tracking-tight">Analytics</h1>
          </div>
          <p className="text-apple-gray-400 mt-1 pl-8">Besucherzahlen & Feedback deiner Artikel</p>
        </div>
      </div>

      {/* Stats Cards - Views */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Gesamt Views</p>
              <p className="text-2xl font-bold text-apple-gray-600">{data?.totalViews.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Artikel</p>
              <p className="text-2xl font-bold text-apple-gray-600">{data?.articles.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Ø Views/Artikel</p>
              <p className="text-2xl font-bold text-apple-gray-600">
                {data?.articles.length
                  ? Math.round(data.totalViews / data.articles.length).toLocaleString()
                  : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Top Artikel</p>
              <p className="text-lg font-bold text-apple-gray-600 truncate max-w-[150px]">
                {data?.popular[0]?.articleId
                  ? data.articles.find(a => a.articleId === data.popular[0].articleId)?.title || 'N/A'
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Feedback */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Hilfreich</p>
              <p className="text-2xl font-bold text-emerald-600">{data?.feedback?.totalHelpful || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Nicht hilfreich</p>
              <p className="text-2xl font-bold text-red-600">{data?.feedback?.totalNotHelpful || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Gesamt Abstimmungen</p>
              <p className="text-2xl font-bold text-apple-gray-600">{data?.feedback?.totalVotes || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-apple flex items-center justify-center ${
              (data?.feedback?.overallHelpfulPercent || 0) >= 70
                ? 'bg-emerald-100'
                : (data?.feedback?.overallHelpfulPercent || 0) >= 50
                  ? 'bg-amber-100'
                  : 'bg-red-100'
            }`}>
              <svg className={`w-5 h-5 ${
                (data?.feedback?.overallHelpfulPercent || 0) >= 70
                  ? 'text-emerald-600'
                  : (data?.feedback?.overallHelpfulPercent || 0) >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-apple-gray-400">Zufriedenheitsrate</p>
              <p className={`text-2xl font-bold ${
                (data?.feedback?.overallHelpfulPercent || 0) >= 70
                  ? 'text-emerald-600'
                  : (data?.feedback?.overallHelpfulPercent || 0) >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}>
                {data?.feedback?.totalVotes ? `${data.feedback.overallHelpfulPercent}%` : '–'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'today', label: 'Heute' },
          { key: 'week', label: '7 Tage' },
          { key: 'month', label: '30 Tage' },
          { key: 'all', label: 'Gesamt' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTimeFilter(key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              timeFilter === key
                ? 'bg-brand text-white'
                : 'bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-apple-gray-500 text-lg mb-2">Keine Daten vorhanden</p>
            <p className="text-apple-gray-400 text-sm">Sobald Artikel aufgerufen werden, erscheinen hier die Statistiken.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Heute
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    7 Tage
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    30 Tage
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Gesamt
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Feedback
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100">
                {filteredArticles.map((article, index) => (
                  <tr
                    key={article.articleId}
                    className="hover:bg-apple-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 text-sm text-apple-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/articles/${article.articleId}`}
                        className="text-apple-gray-600 hover:text-brand transition-colors font-medium"
                      >
                        {article.title || article.articleId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-medium ${
                        article.viewsToday > 0 ? 'text-green-600' : 'text-apple-gray-400'
                      }`}>
                        {article.viewsToday.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-apple-gray-600">
                      {article.viewsThisWeek.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-apple-gray-600">
                      {article.viewsThisMonth.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-apple-gray-600">
                        {article.totalViews.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {article.totalFeedback > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-emerald-600 font-medium" title="Hilfreich">
                              👍 {article.helpful}
                            </span>
                            <span className="text-red-500 font-medium" title="Nicht hilfreich">
                              👎 {article.notHelpful}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            article.helpfulPercent >= 70
                              ? 'bg-emerald-100 text-emerald-700'
                              : article.helpfulPercent >= 50
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {article.helpfulPercent}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-apple-gray-300">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DSGVO Notice */}
      <div className="mt-6 text-center text-sm text-apple-gray-400">
        <p>📊 Anonyme Zähler ohne personenbezogene Daten – DSGVO-konform</p>
      </div>
    </div>
  );
}
