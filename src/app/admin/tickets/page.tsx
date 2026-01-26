"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

const statusConfig = {
  open: { label: "Offen", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  in_progress: { label: "In Bearbeitung", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  resolved: { label: "Gelöst", color: "bg-green-50 text-green-700 ring-green-600/20" },
  closed: { label: "Geschlossen", color: "bg-gray-50 text-gray-600 ring-gray-500/20" },
};

const priorityConfig = {
  low: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Hoch", color: "bg-red-100 text-red-600" },
};

async function fetchTickets(): Promise<Ticket[]> {
  const res = await fetch('/api/admin/tickets', {
    cache: 'no-store',
    headers: {
      'Authorization': `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch tickets');
  }

  return res.json();
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [emailFetchResult, setEmailFetchResult] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch emails in background (without blocking UI)
  const fetchEmailsInBackground = async () => {
    try {
      await fetch('/api/admin/fetch-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`
        }
      });
    } catch (err) {
      console.error('Background email fetch failed:', err);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      // Load tickets first (fast)
      await loadTickets();
      setLoading(false);

      // Then fetch emails in background
      fetchEmailsInBackground().then(() => loadTickets());
    };
    initLoad();
  }, []);

  // Auto-refresh tickets every 10 seconds + fetch emails every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    // Ticket refresh every 10 seconds
    const ticketInterval = setInterval(async () => {
      try {
        const fetchedTickets = await fetchTickets();
        setTickets(fetchedTickets);
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    }, 10000);

    // Email fetch every 30 seconds
    const emailInterval = setInterval(async () => {
      await fetchEmailsInBackground();
      const fetchedTickets = await fetchTickets();
      setTickets(fetchedTickets);
      setLastRefresh(new Date());
    }, 30000);

    return () => {
      clearInterval(ticketInterval);
      clearInterval(emailInterval);
    };
  }, [autoRefresh]);

  const loadTickets = async () => {
    try {
      const fetchedTickets = await fetchTickets();
      setTickets(fetchedTickets);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFetchEmails = async () => {
    setFetchingEmails(true);
    setEmailFetchResult(null);
    try {
      const res = await fetch('/api/admin/fetch-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`
        }
      });
      const data = await res.json();
      console.log('Email fetch result:', data);
      if (data.debug) {
        console.log('Debug info:', data.debug.join('\n'));
      }
      if (data.success && data.errors?.length === 0) {
        setEmailFetchResult(`${data.processed} neue E-Mail(s) verarbeitet`);
        if (data.processed > 0) {
          await loadTickets();
        }
      } else {
        const errorMsg = data.errors?.join(', ') || data.error || 'Unbekannt';
        setEmailFetchResult('Fehler: ' + errorMsg);
        if (data.debug) {
          alert('Debug Info:\n\n' + data.debug.join('\n'));
        }
      }
    } catch (err: any) {
      setEmailFetchResult('Fehler: ' + err.message);
    } finally {
      setFetchingEmails(false);
      setTimeout(() => setEmailFetchResult(null), 5000);
    }
  };

  const toggleSelectTicket = (id: string) => {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedTickets.map((t) => t.id);
    const allVisibleSelected = visibleIds.every(id => selectedTickets.has(id));

    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedTickets(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedTickets(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTickets.size === 0) return;

    const ticketIds = Array.from(selectedTickets);
    const total = ticketIds.length;

    setDeleting(true);
    setDeleteProgress({ current: 0, total });

    try {
      // Lösche Tickets einzeln für Fortschrittsanzeige
      for (let i = 0; i < ticketIds.length; i++) {
        const id = ticketIds[i];
        await fetch(`/api/admin/tickets/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`
          }
        });
        setDeleteProgress({ current: i + 1, total });
      }

      setSelectedTickets(new Set());
      await loadTickets();
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  const filteredTickets = tickets.filter(t => {
    // Status filter
    if (filterStatus !== "all" && t.status !== filterStatus) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.ticketNumber.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.customerName.toLowerCase().includes(query) ||
        t.customerEmail.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, itemsPerPage]);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Tickets werden geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin" className="text-apple-gray-400 hover:text-brand transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-apple-gray-600 tracking-tight">Support Tickets</h1>
          </div>
          <p className="text-apple-gray-400 ml-8">Verwalte Kundenanfragen</p>
        </div>
        <div className="flex items-center gap-3">
          {emailFetchResult && (
            <span className={`text-sm ${emailFetchResult.startsWith('Fehler') ? 'text-red-500' : 'text-green-600'}`}>
              {emailFetchResult}
            </span>
          )}
          {selectedTickets.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {selectedTickets.size} löschen
            </button>
          )}
          <button
            onClick={handleFetchEmails}
            disabled={fetchingEmails}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-apple-gray-200 text-apple-gray-600 font-medium rounded-full hover:bg-apple-gray-50 transition-colors disabled:opacity-50"
          >
            {fetchingEmails ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Abrufen...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                E-Mails abrufen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gesamt", value: stats.total, color: "bg-apple-gray-100 text-apple-gray-600" },
          { label: "Offen", value: stats.open, color: "bg-blue-100 text-blue-600" },
          { label: "In Bearbeitung", value: stats.inProgress, color: "bg-amber-100 text-amber-600" },
          { label: "Gelöst", value: stats.resolved, color: "bg-green-100 text-green-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-apple-lg shadow-card border border-apple-gray-100 p-4">
            <p className="text-sm text-apple-gray-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Suche nach Ticket-Nr., Betreff, Name oder E-Mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-apple-gray-200 rounded-full text-apple-gray-600 placeholder-apple-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Auto-Refresh Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadTickets()}
            className="p-2.5 bg-white border border-apple-gray-200 rounded-full hover:bg-apple-gray-50 transition-colors"
            title="Jetzt aktualisieren"
          >
            <svg className="w-5 h-5 text-apple-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-brand bg-white border-apple-gray-300 rounded focus:ring-brand focus:ring-2"
            />
            <span className="text-sm text-apple-gray-500">Auto-Refresh</span>
          </label>
          <span className="text-xs text-apple-gray-400">
            {lastRefresh.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Alle" },
          { value: "open", label: "Offen" },
          { value: "in_progress", label: "In Bearbeitung" },
          { value: "resolved", label: "Gelöst" },
          { value: "closed", label: "Geschlossen" },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setFilterStatus(filter.value); setSelectedTickets(new Set()); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              filterStatus === filter.value
                ? "bg-brand text-white"
                : "bg-apple-gray-100 text-apple-gray-500 hover:bg-apple-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        {paginatedTickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-apple-gray-500 text-lg mb-2">Keine Tickets gefunden</p>
            <p className="text-apple-gray-400 text-sm">
              {filterStatus !== "all" ? "Versuche einen anderen Filter." : "Es wurden noch keine Anfragen gesendet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={paginatedTickets.length > 0 && paginatedTickets.every(t => selectedTickets.has(t.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-brand bg-white border-apple-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Kunde
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Priorität
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Erstellt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100">
                {paginatedTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-apple-gray-50 transition-colors duration-150 cursor-pointer ${selectedTickets.has(ticket.id) ? 'bg-brand/5' : ''}`}
                  >
                    <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => toggleSelectTicket(ticket.id)}
                        className="w-4 h-4 text-brand bg-white border-apple-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-5" onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-apple-gray-400 mb-1">
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-base font-medium text-apple-gray-600">
                          {ticket.subject}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-apple-gray-600">
                          {ticket.customerName}
                        </span>
                        <span className="text-xs text-apple-gray-400">
                          {ticket.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}>
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${statusConfig[ticket.status].color}`}>
                        {statusConfig[ticket.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-5" onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${priorityConfig[ticket.priority].color}`}>
                        {priorityConfig[ticket.priority].label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-apple-gray-400" onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}>
                      {new Date(ticket.createdAt).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer with Pagination */}
      {filteredTickets.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Info */}
          <div className="text-sm text-apple-gray-400">
            {selectedTickets.size > 0 && (
              <span className="text-brand font-medium">{selectedTickets.size} ausgewählt · </span>
            )}
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTickets.length)} von {filteredTickets.length} Tickets
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-4">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-apple-gray-400">Pro Seite:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-apple-gray-200 rounded-lg text-sm text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-apple-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Erste Seite"
              >
                <svg className="w-4 h-4 text-apple-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-apple-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Vorherige Seite"
              >
                <svg className="w-4 h-4 text-apple-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="px-3 py-1 text-sm text-apple-gray-600">
                Seite {currentPage} von {totalPages || 1}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg hover:bg-apple-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Nächste Seite"
              >
                <svg className="w-4 h-4 text-apple-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg hover:bg-apple-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Letzte Seite"
              >
                <svg className="w-4 h-4 text-apple-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 animate-fade-in pt-20">
          <div className="bg-white rounded-apple-xl shadow-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-apple-gray-600">
                  {deleting ? 'Lösche Tickets...' : 'Tickets löschen?'}
                </h3>
                <p className="text-sm text-apple-gray-400">
                  {deleting
                    ? `${deleteProgress.current} von ${deleteProgress.total} gelöscht`
                    : `${selectedTickets.size} ${selectedTickets.size === 1 ? 'Ticket wird' : 'Tickets werden'} unwiderruflich gelöscht.`
                  }
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {deleting && deleteProgress.total > 0 && (
              <div className="mb-4">
                <div className="w-full bg-apple-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-sm text-apple-gray-500 mt-2">
                  {Math.round((deleteProgress.current / deleteProgress.total) * 100)}%
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-apple-gray-600 font-medium rounded-full hover:bg-apple-gray-100 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Bitte warten...' : 'Abbrechen'}
              </button>
              {!deleting && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors"
                >
                  Endgültig löschen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
