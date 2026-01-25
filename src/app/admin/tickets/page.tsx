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

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const fetchedTickets = await fetchTickets();
        setTickets(fetchedTickets);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const filteredTickets = filterStatus === "all"
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

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
            onClick={() => setFilterStatus(filter.value)}
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
        {filteredTickets.length === 0 ? (
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
                {filteredTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-apple-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => window.location.href = `/admin/tickets/${ticket.id}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-apple-gray-400 mb-1">
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-base font-medium text-apple-gray-600">
                          {ticket.subject}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-apple-gray-600">
                          {ticket.customerName}
                        </span>
                        <span className="text-xs text-apple-gray-400">
                          {ticket.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${statusConfig[ticket.status].color}`}>
                        {statusConfig[ticket.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${priorityConfig[ticket.priority].color}`}>
                        {priorityConfig[ticket.priority].label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-apple-gray-400">
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

      {/* Footer Stats */}
      {filteredTickets.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-apple-gray-400">
          <span>{filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'} angezeigt</span>
        </div>
      )}
    </div>
  );
}
