"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

interface RatingWithContact {
  id: string;
  ticketId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  customerEmail: string;
  customerName?: string;
  ticketNumber?: string;
  ticketSubject?: string;
}

interface RatingStats {
  totalRatings: number;
  avgRating: number;
  distribution: { [key: number]: number };
  recentRatings?: RatingWithContact[];
}

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTimeHours: number | null;
  ticketsByDay: { date: string; count: number; open: number; resolved: number }[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByChannel: { channel: string; count: number }[];
}

interface SearchStats {
  totalSearches: number;
  uniqueQueries: number;
  topQueries: { query: string; count: number }[];
  noResultQueries: { query: string; count: number }[];
  searchesByDay: { date: string; count: number }[];
}

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "tickets" | "search" | "ratings">("overview");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [analyticsRes, ratingsRes, ticketsRes, searchRes] = await Promise.all([
          fetch("/api/admin/analytics", { credentials: "same-origin" }),
          fetch("/api/admin/analytics/ratings?includeRecent=true&includeContact=true&limit=20", { credentials: "same-origin" }),
          fetch("/api/admin/analytics/tickets?days=30", { credentials: "same-origin" }),
          fetch("/api/admin/analytics/search?days=30", { credentials: "same-origin" }),
        ]);

        if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");
        const analyticsData = await analyticsRes.json();
        setData(analyticsData);

        if (ratingsRes.ok) {
          const ratingsData = await ratingsRes.json();
          setRatingStats(ratingsData);
        }

        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setTicketStats(ticketsData);
        }

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          setSearchStats(searchData);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const getViewsByFilter = (article: AnalyticsSummary): number => {
    switch (timeFilter) {
      case "today":
        return article.viewsToday;
      case "week":
        return article.viewsThisWeek;
      case "month":
        return article.viewsThisMonth;
      default:
        return article.totalViews;
    }
  };

  const filteredArticles =
    data?.articles
      .map((a) => ({ ...a, filteredViews: getViewsByFilter(a) }))
      .sort((a, b) => b.filteredViews - a.filteredViews) || [];

  if (loading) {
    return (
      <div className="animate-fade-in">
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
      <div className="animate-fade-in">
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Analytics</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Übersicht über Tickets, Suchen & Bewertungen</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-apple-gray-200 pb-4">
        {[
          { key: "overview", label: "Übersicht", icon: "📊" },
          { key: "tickets", label: "Tickets", icon: "🎫" },
          { key: "search", label: "Suche", icon: "🔍" },
          { key: "ratings", label: "Bewertungen", icon: "⭐" },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-3 min-h-[44px] text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
              activeTab === key ? "bg-brand text-white" : "bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200"
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-apple flex items-center justify-center">
                  <span className="text-xl">🎫</span>
                </div>
                <div>
                  <p className="text-sm text-apple-gray-400">Offene Tickets</p>
                  <p className="text-2xl font-bold text-apple-gray-600">{ticketStats?.openTickets || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-apple flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <p className="text-sm text-apple-gray-400">Gelöste Tickets</p>
                  <p className="text-2xl font-bold text-green-600">{ticketStats?.resolvedTickets || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-apple flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
                <div>
                  <p className="text-sm text-apple-gray-400">Suchen (30 Tage)</p>
                  <p className="text-2xl font-bold text-apple-gray-600">{searchStats?.totalSearches || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-apple flex items-center justify-center">
                  <span className="text-xl">⭐</span>
                </div>
                <div>
                  <p className="text-sm text-apple-gray-400">Ø Bewertung</p>
                  <p className="text-2xl font-bold text-apple-gray-600">
                    {ratingStats?.avgRating ? `${ratingStats.avgRating.toFixed(1)} / 5` : "–"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Volume Chart */}
          {ticketStats && ticketStats.ticketsByDay.length > 0 && (
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-apple-gray-600 mb-4">Ticket-Volumen (30 Tage)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketStats.ticketsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(d) => new Date(d as string).toLocaleDateString("de-DE")}
                    />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="Neue Tickets" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Article Views Table (existing) */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
            <div className="p-4 border-b border-apple-gray-100 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-lg font-semibold text-apple-gray-600">Artikel-Views</h2>
              <div className="flex gap-2">
                {[
                  { key: "today", label: "Heute" },
                  { key: "week", label: "7 Tage" },
                  { key: "month", label: "30 Tage" },
                  { key: "all", label: "Gesamt" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTimeFilter(key as typeof timeFilter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      timeFilter === key ? "bg-brand text-white" : "bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-apple-gray-400">Keine Artikel-Daten vorhanden</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Artikel</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-apple-gray-400 uppercase">Views</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-apple-gray-400 uppercase">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-apple-gray-100">
                    {filteredArticles.slice(0, 10).map((article, index) => (
                      <tr key={article.articleId} className="hover:bg-apple-gray-50">
                        <td className="px-4 py-3 text-sm text-apple-gray-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/articles/${article.articleId}`} className="text-apple-gray-600 hover:text-brand font-medium">
                            {article.title || article.articleId}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-apple-gray-600">{article.filteredViews}</td>
                        <td className="px-4 py-3 text-center">
                          {article.totalFeedback > 0 ? (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                article.helpfulPercent >= 70
                                  ? "bg-emerald-100 text-emerald-700"
                                  : article.helpfulPercent >= 50
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {article.helpfulPercent}%
                            </span>
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
        </>
      )}

      {/* TICKETS TAB */}
      {activeTab === "tickets" && ticketStats && (
        <>
          {/* Ticket Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Gesamt", value: ticketStats.totalTickets, color: "bg-blue-100 text-blue-600" },
              { label: "Offen", value: ticketStats.openTickets, color: "bg-red-100 text-red-600" },
              { label: "In Bearbeitung", value: ticketStats.inProgressTickets, color: "bg-amber-100 text-amber-600" },
              { label: "Gelöst", value: ticketStats.resolvedTickets, color: "bg-green-100 text-green-600" },
              { label: "Geschlossen", value: ticketStats.closedTickets, color: "bg-gray-100 text-gray-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-4">
                <p className="text-sm text-apple-gray-400">{label}</p>
                <p className={`text-2xl font-bold ${color.split(" ")[1]}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Resolution Time */}
          {ticketStats.avgResolutionTimeHours !== null && (
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-apple flex items-center justify-center">
                  <span className="text-xl">⏱️</span>
                </div>
                <div>
                  <p className="text-sm text-apple-gray-400">Ø Lösungszeit</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {ticketStats.avgResolutionTimeHours < 24
                      ? `${ticketStats.avgResolutionTimeHours.toFixed(1)} Stunden`
                      : `${(ticketStats.avgResolutionTimeHours / 24).toFixed(1)} Tage`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ticket Volume Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">Tickets pro Tag</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketStats.ticketsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("de-DE")} />
                    <Bar dataKey="count" fill="#3b82f6" name="Neue Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">Nach Kanal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketStats.ticketsByChannel}
                      dataKey="count"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {ticketStats.ticketsByChannel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SEARCH TAB */}
      {activeTab === "search" && searchStats && (
        <>
          {/* Search Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <p className="text-sm text-apple-gray-400">Gesamt Suchen</p>
              <p className="text-2xl font-bold text-apple-gray-600">{searchStats.totalSearches}</p>
            </div>
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <p className="text-sm text-apple-gray-400">Unique Begriffe</p>
              <p className="text-2xl font-bold text-apple-gray-600">{searchStats.uniqueQueries}</p>
            </div>
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <p className="text-sm text-apple-gray-400">Ohne Ergebnis</p>
              <p className="text-2xl font-bold text-red-600">{searchStats.noResultQueries.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Queries */}
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">🔥 Top Suchbegriffe</h3>
              {searchStats.topQueries.length === 0 ? (
                <p className="text-apple-gray-400 text-center py-4">Noch keine Suchen</p>
              ) : (
                <div className="space-y-3">
                  {searchStats.topQueries.map((item, index) => (
                    <div key={item.query} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-apple-gray-300 w-6">{index + 1}</span>
                      <span className="flex-1 font-medium text-apple-gray-600">{item.query}</span>
                      <span className="text-sm text-apple-gray-400 bg-apple-gray-100 px-2 py-0.5 rounded-full">
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* No Result Queries */}
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">❌ Suchen ohne Ergebnis</h3>
              <p className="text-sm text-apple-gray-400 mb-4">Diese Begriffe brauchen Content!</p>
              {searchStats.noResultQueries.length === 0 ? (
                <p className="text-green-600 text-center py-4">✅ Alle Suchen hatten Ergebnisse!</p>
              ) : (
                <div className="space-y-3">
                  {searchStats.noResultQueries.map((item) => (
                    <div key={item.query} className="flex items-center gap-3">
                      <span className="flex-1 font-medium text-red-600">{item.query}</span>
                      <span className="text-sm text-apple-gray-400 bg-red-100 px-2 py-0.5 rounded-full">{item.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* RATINGS TAB */}
      {activeTab === "ratings" && ratingStats && (
        <>
          {/* Rating Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Average Rating Card */}
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <div className="text-center">
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-3xl ${star <= Math.round(ratingStats.avgRating) ? "text-yellow-400" : "text-gray-300"}`}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-3xl font-bold text-apple-gray-600">{ratingStats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-apple-gray-400 mt-1">Durchschnitt aus {ratingStats.totalRatings} Bewertungen</p>
              </div>
            </div>

            {/* Distribution Card */}
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-sm font-semibold text-apple-gray-500 mb-4">Verteilung</h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingStats.distribution[star] || 0;
                  const percentage = ratingStats.totalRatings > 0 ? Math.round((count / ratingStats.totalRatings) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm text-apple-gray-500 w-3">{star}</span>
                      <span className="text-yellow-400">★</span>
                      <div className="flex-1 h-2 bg-apple-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-xs text-apple-gray-400 w-16 text-right">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
              <h3 className="text-sm font-semibold text-apple-gray-500 mb-4">Schnellübersicht</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-apple-gray-500">Gesamt Bewertungen</span>
                  <span className="font-bold text-apple-gray-600">{ratingStats.totalRatings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-apple-gray-500">5-Sterne</span>
                  <span className="font-bold text-green-600">{ratingStats.distribution[5] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-apple-gray-500">1-Stern</span>
                  <span className="font-bold text-red-600">{ratingStats.distribution[1] || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* All Ratings with Contact Info */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
            <div className="p-4 border-b border-apple-gray-100">
              <h3 className="text-lg font-semibold text-apple-gray-600">Alle Bewertungen</h3>
              <p className="text-sm text-apple-gray-400">Wer hat wie bewertet</p>
            </div>
            {!ratingStats.recentRatings || ratingStats.recentRatings.length === 0 ? (
              <div className="text-center py-8 text-apple-gray-400">Noch keine Bewertungen vorhanden</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Ticket</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Kunde</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-apple-gray-400 uppercase">Bewertung</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Kommentar</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-apple-gray-400 uppercase">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-apple-gray-100">
                    {ratingStats.recentRatings.map((rating) => (
                      <tr key={rating.id} className="hover:bg-apple-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/tickets/${rating.ticketId}`} className="text-brand hover:underline font-medium">
                            {rating.ticketNumber || "#???"}
                          </Link>
                          {rating.ticketSubject && (
                            <p className="text-xs text-apple-gray-400 truncate max-w-[200px]">{rating.ticketSubject}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-apple-gray-600">{rating.customerName || "Unbekannt"}</p>
                          <p className="text-xs text-apple-gray-400">{rating.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-lg ${star <= rating.rating ? "text-yellow-400" : "text-gray-300"}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {rating.comment ? (
                            <p className="text-sm text-apple-gray-600 max-w-[300px]">&quot;{rating.comment}&quot;</p>
                          ) : (
                            <span className="text-xs text-apple-gray-300">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-apple-gray-400">
                          {new Date(rating.createdAt).toLocaleDateString("de-DE")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* DSGVO Notice */}
      <div className="mt-6 text-center text-sm text-apple-gray-400">
        <p>📊 Anonyme Zähler ohne personenbezogene Daten – DSGVO-konform</p>
      </div>
    </div>
  );
}
