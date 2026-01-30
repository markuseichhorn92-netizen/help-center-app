"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { SLAWidget, CSATWidget } from "@/components/dashboard";

interface DashboardData {
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    unreadMessages: number;
  };
  articles: {
    total: number;
    published: number;
    draft: number;
    totalViews: number;
  };
  contacts: {
    total: number;
  };
  ticketsWithUnread: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    status: string;
    unreadCount: number;
    updatedAt: string;
  }>;
  topArticles: Array<{
    id: string;
    title: string;
    views: number;
    published: boolean;
  }>;
  recentContacts: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  analytics: {
    todayViews: number;
    yesterdayViews: number;
    viewsTrend: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "same-origin",
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        throw new Error("Fehler beim Laden");
      }

      const dashboardData = await res.json();
      setData(dashboardData);
      setLastUpdate(new Date());
      if (isInitial) setError(null);
    } catch (err: any) {
      if (isInitial) setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Dashboard wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error || "Daten konnten nicht geladen werden"}</span>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
  };

  const statusLabels: Record<string, string> = {
    open: "Offen",
    in_progress: "In Bearbeitung",
    resolved: "Gelöst",
    closed: "Geschlossen",
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-apple-gray-400 text-sm">
              Willkommen im Admin-Bereich
            </p>
            {lastUpdate && (
              <>
                <span className="text-apple-gray-300">•</span>
                <button
                  onClick={() => loadDashboard(false)}
                  className="text-apple-gray-400 text-sm hover:text-brand transition-colors flex items-center gap-1"
                  title="Jetzt aktualisieren"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-apple-gray-200 text-apple-gray-600 font-medium rounded-full hover:bg-apple-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Neues Ticket
          </Link>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Neuer Artikel
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Unread Messages */}
        <Link
          href="/admin/tickets?filter=unread"
          className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              data.tickets.unreadMessages > 0 ? "bg-red-100" : "bg-apple-gray-100"
            }`}>
              <svg className={`w-6 h-6 ${data.tickets.unreadMessages > 0 ? "text-red-600" : "text-apple-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-apple-gray-300 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className={`text-3xl font-bold ${data.tickets.unreadMessages > 0 ? "text-red-600" : "text-apple-gray-600"}`}>
            {data.tickets.unreadMessages}
          </p>
          <p className="text-sm text-apple-gray-400 mt-1">Neue Nachrichten</p>
        </Link>

        {/* Open Tickets */}
        <Link
          href="/admin/tickets"
          className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-apple-gray-300 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-apple-gray-600">{data.tickets.open + data.tickets.inProgress}</p>
          <p className="text-sm text-apple-gray-400 mt-1">Offene Tickets</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-blue-600">{data.tickets.open} offen</span>
            <span className="text-apple-gray-300">|</span>
            <span className="text-amber-600">{data.tickets.inProgress} in Bearbeitung</span>
          </div>
        </Link>

        {/* Articles */}
        <Link
          href="/admin/articles"
          className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-apple-gray-300 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-apple-gray-600">{data.articles.total}</p>
          <p className="text-sm text-apple-gray-400 mt-1">Artikel</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{data.articles.published} veröffentlicht</span>
            <span className="text-apple-gray-300">|</span>
            <span className="text-amber-600">{data.articles.draft} Entwürfe</span>
          </div>
        </Link>

        {/* Analytics */}
        <Link
          href="/admin/analytics"
          className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-apple-gray-300 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-apple-gray-600">{data.analytics.todayViews}</p>
          <p className="text-sm text-apple-gray-400 mt-1">Aufrufe heute</p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {data.analytics.viewsTrend > 0 ? (
              <>
                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-green-600">+{data.analytics.viewsTrend}% vs gestern</span>
              </>
            ) : data.analytics.viewsTrend < 0 ? (
              <>
                <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-red-600">{data.analytics.viewsTrend}% vs gestern</span>
              </>
            ) : (
              <span className="text-apple-gray-400">Gleich wie gestern</span>
            )}
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tickets with Unread Messages */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-apple-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-apple-gray-600">Neue Nachrichten</h2>
            <Link
              href="/admin/tickets?filter=unread"
              className="text-sm text-brand hover:text-brand-dark font-medium"
            >
              Alle anzeigen
            </Link>
          </div>
          <div className="divide-y divide-apple-gray-100">
            {data.ticketsWithUnread.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-apple-gray-500">Keine ungelesenen Nachrichten</p>
              </div>
            ) : (
              data.ticketsWithUnread.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-apple-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-sm">{ticket.unreadCount}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-apple-gray-400">{ticket.ticketNumber}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[ticket.status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[ticket.status] || ticket.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-apple-gray-600 truncate mt-0.5">{ticket.subject}</p>
                    <p className="text-xs text-apple-gray-400 truncate">{ticket.customerName}</p>
                  </div>
                  <svg className="w-5 h-5 text-apple-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top Articles */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-apple-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-apple-gray-600">Beliebte Artikel</h2>
            <Link
              href="/admin/analytics"
              className="text-sm text-brand hover:text-brand-dark font-medium"
            >
              Analytics
            </Link>
          </div>
          <div className="divide-y divide-apple-gray-100">
            {data.topArticles.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-apple-gray-500">Noch keine Artikel</p>
              </div>
            ) : (
              data.topArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/admin/edit/${article.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-apple-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-apple-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-apple-gray-500 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-apple-gray-600 truncate">{article.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        article.published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {article.published ? "Veröffentlicht" : "Entwurf"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-apple-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium">{article.views}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SLA & CSAT Widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SLAWidget />
        <CSATWidget />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Contacts */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-apple-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-apple-gray-600">Neue Kontakte</h2>
            <Link
              href="/admin/contacts"
              className="text-sm text-brand hover:text-brand-dark font-medium"
            >
              Alle anzeigen
            </Link>
          </div>
          <div className="divide-y divide-apple-gray-100">
            {data.recentContacts.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-apple-gray-400 text-sm">Noch keine Kontakte</p>
              </div>
            ) : (
              data.recentContacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/admin/contacts/${contact.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-apple-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 bg-brand/10 rounded-full flex items-center justify-center text-brand font-semibold text-sm">
                    {contact.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-apple-gray-600 truncate">{contact.name}</p>
                    <p className="text-xs text-apple-gray-400 truncate">{contact.email}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-2 bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
          <h2 className="font-semibold text-apple-gray-600 mb-4">Schnellzugriff</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/articles"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Artikel</p>
                <p className="text-xs text-apple-gray-400">{data.articles.total} Artikel</p>
              </div>
            </Link>

            <Link
              href="/admin/tickets"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Tickets</p>
                <p className="text-xs text-apple-gray-400">{data.tickets.total} Tickets</p>
              </div>
            </Link>

            <Link
              href="/admin/contacts"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Kontakte</p>
                <p className="text-xs text-apple-gray-400">{data.contacts.total} Kontakte</p>
              </div>
            </Link>

            <Link
              href="/admin/categories"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Kategorien</p>
                <p className="text-xs text-apple-gray-400">Verwaltung</p>
              </div>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Analytics</p>
                <p className="text-xs text-apple-gray-400">{data.articles.totalViews} Aufrufe</p>
              </div>
            </Link>

            <Link
              href="/admin/knowledge"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-apple-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600">Knowledge</p>
                <p className="text-xs text-apple-gray-400">KI-Wissensbasis</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
