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
  unreadCount?: number;
  channel?: "email" | "whatsapp" | "web";
}

// Channel icon component
function ChannelIcon({ channel }: { channel?: string }) {
  if (channel === 'whatsapp') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100" title="WhatsApp">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </span>
    );
  }

  // Default: Email icon (blue)
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100" title="E-Mail">
      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </span>
  );
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
    credentials: 'same-origin',
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Session abgelaufen');
    }
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
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [newItemsAvailable, setNewItemsAvailable] = useState(false);

  // Fetch emails in background (without blocking UI)
  const fetchEmailsInBackground = async () => {
    try {
      await fetch('/api/admin/fetch-emails', {
        method: 'POST',
        credentials: 'same-origin',
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
        
        // Check if there are new tickets or updates
        const hasNewItems = fetchedTickets.length > tickets.length || 
          fetchedTickets.some((ft, idx) => {
            const existingTicket = tickets[idx];
            return existingTicket && (
              ft.updatedAt !== existingTicket.updatedAt ||
              (ft.unreadCount || 0) > (existingTicket.unreadCount || 0)
            );
          });
        
        if (hasNewItems) {
          setNewItemsAvailable(true);
        }
        
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
  }, [autoRefresh, tickets.length]);

  const loadTickets = async () => {
    try {
      const fetchedTickets = await fetchTickets();
      setTickets(fetchedTickets);
      setLastRefresh(new Date());
      setNewItemsAvailable(false); // Reset notification
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
        credentials: 'same-origin',
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
          credentials: 'same-origin',
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

  const handleBatchStatusChange = async (newStatus: string) => {
    if (selectedTickets.size === 0) return;

    setUpdatingStatus(true);
    setShowStatusMenu(false);

    try {
      const res = await fetch('/api/admin/tickets/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          ids: Array.from(selectedTickets),
          status: newStatus,
        }),
      });

      if (res.ok) {
        setSelectedTickets(new Set());
        await loadTickets();
      } else {
        const data = await res.json();
        alert('Fehler: ' + (data.message || 'Unbekannter Fehler'));
      }
    } catch (err: any) {
      console.error('Batch status update error:', err);
      alert('Fehler beim Aktualisieren der Tickets');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTickets = tickets
    .filter(t => {
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
    })
    .sort((a, b) => {
      // Sort by status priority first (open > in_progress > resolved > closed)
      const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by unreadCount (descending)
      const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0);
      if (unreadDiff !== 0) return unreadDiff;
      
      // Finally by updatedAt (newest first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Support Tickets</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Verwalte Kundenanfragen</p>
        </div>
        <div className="flex items-center gap-3">
          {emailFetchResult && (
            <span className={`text-sm ${emailFetchResult.startsWith('Fehler') ? 'text-red-500' : 'text-green-600'}`}>
              {emailFetchResult}
            </span>
          )}
          {selectedTickets.size > 0 && (
            <>
              {/* Batch Status Change Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={updatingStatus}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {updatingStatus ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Status ändern</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-apple-lg shadow-lg border border-apple-gray-200 py-1 z-20">
                    <button
                      onClick={() => handleBatchStatusChange('open')}
                      className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Offen
                    </button>
                    <button
                      onClick={() => handleBatchStatusChange('in_progress')}
                      className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-amber-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      In Bearbeitung
                    </button>
                    <button
                      onClick={() => handleBatchStatusChange('resolved')}
                      className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-green-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Gelöst
                    </button>
                    <button
                      onClick={() => handleBatchStatusChange('closed')}
                      className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                      Geschlossen
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">{selectedTickets.size} löschen</span>
              </button>
            </>
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
                <span className="hidden sm:inline">Abrufen...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">E-Mails abrufen</span>
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

      {/* New Items Notification */}
      {newItemsAvailable && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-apple-lg p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Neue Nachrichten oder Updates verfügbar</span>
          </div>
          <button
            onClick={loadTickets}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      )}

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

      {/* Tickets Table / Cards */}
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
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                          <div className="flex items-center gap-2 mb-1">
                            <ChannelIcon channel={ticket.channel} />
                            <span className="text-xs font-mono text-apple-gray-400">
                              {ticket.ticketNumber}
                            </span>
                            {ticket.unreadCount && ticket.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                                {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
                              </span>
                            )}
                          </div>
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

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-apple-gray-100">
              {paginatedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}
                  className={`p-4 hover:bg-apple-gray-50 transition-colors duration-150 cursor-pointer ${selectedTickets.has(ticket.id) ? 'bg-brand/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => toggleSelectTicket(ticket.id)}
                        className="w-4 h-4 text-brand bg-white border-apple-gray-300 rounded focus:ring-brand focus:ring-2 cursor-pointer mt-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ChannelIcon channel={ticket.channel} />
                            <span className="text-xs font-mono text-apple-gray-400">
                              {ticket.ticketNumber}
                            </span>
                            {ticket.unreadCount && ticket.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                                {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
                              </span>
                            )}
                          </div>
                          <span className="text-base font-medium text-apple-gray-600 block truncate">
                            {ticket.subject}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ring-1 ring-inset flex-shrink-0 ${statusConfig[ticket.status].color}`}>
                          {statusConfig[ticket.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-apple-gray-600">
                          {ticket.customerName}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${priorityConfig[ticket.priority].color}`}>
                          {priorityConfig[ticket.priority].label}
                        </span>
                      </div>
                      <p className="text-xs text-apple-gray-400">
                        {new Date(ticket.createdAt).toLocaleDateString('de-DE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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
              <span className="hidden sm:inline text-sm text-apple-gray-400">Pro Seite:</span>
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

      {/* Click outside to close status menu */}
      {showStatusMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
      )}
    </div>
  );
}
