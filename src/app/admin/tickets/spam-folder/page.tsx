"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  channel?: "email" | "whatsapp" | "web";
  spamReason?: string;
}

function ChannelIcon({ channel }: { channel?: string }) {
  if (channel === "whatsapp") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100" title="WhatsApp">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </span>
    );
  }
  if (channel === "web") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100" title="Web">
        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100" title="E-Mail">
      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </span>
  );
}

const spamReasonLabels: Record<string, string> = {
  "Bot erkannt": "Bot (Honeypot)",
  "E-Mail-Adresse blockiert": "Blockierte E-Mail",
  "E-Mail-Domain blockiert": "Blockierte Domain",
  "Wegwerf-E-Mail-Adresse nicht erlaubt": "Wegwerf-E-Mail",
  "Zu viele Anfragen. Bitte warten Sie eine Stunde.": "Rate-Limit (E-Mail)",
  "Zu viele Anfragen von dieser IP-Adresse": "Rate-Limit (IP)",
  "Nachricht als Spam erkannt": "Spam-Inhalt",
  "Spam erkannt": "Spam erkannt",
};

export default function SpamFolderPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketContent, setTicketContent] = useState<string>("");

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/admin/tickets/spam", {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  };

  const loadTicketContent = async (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      return;
    }

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        credentials: "same-origin",
      });
      if (res.ok) {
        const messages = await res.json();
        if (messages.length > 0) {
          setTicketContent(messages[0].content);
        }
      }
      setExpandedTicket(ticketId);
    } catch (err) {
      console.error("Load content error:", err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map((t) => t.id)));
    }
  };

  const handleMarkNotSpam = async (ids: string[]) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/tickets/spam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ticketIds: ids }),
      });
      if (res.ok) {
        setSelectedTickets(new Set());
        await loadTickets();
      }
    } catch (err) {
      console.error("Mark not spam error:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`${ids.length} Spam-Ticket(s) endgültig löschen?`)) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/tickets/spam?ticketIds=${ids.join(",")}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setSelectedTickets(new Set());
        await loadTickets();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in py-12 text-center">
        <div className="inline-flex items-center gap-3 text-apple-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-lg">Wird geladen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/tickets" className="text-apple-gray-400 hover:text-apple-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Spam</h1>
          </div>
          <p className="text-apple-gray-400 text-sm">
            Vom Spam-Filter abgefangene Tickets zur Überprüfung
          </p>
        </div>
        {selectedTickets.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkNotSpam(Array.from(selectedTickets))}
              disabled={processing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Kein Spam ({selectedTickets.size})
            </button>
            <button
              onClick={() => handleDelete(Array.from(selectedTickets))}
              disabled={processing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Löschen
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-apple-lg mb-6">
          {error}
        </div>
      )}

      {/* Ticket List */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-apple-gray-500 text-lg mb-2">Kein Spam</p>
            <p className="text-apple-gray-400 text-sm">Alle Anfragen wurden als legitim eingestuft</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTickets.size === tickets.length && tickets.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-apple-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Absender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Empfangen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">Spam-Grund</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-apple-gray-400 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100">
                {tickets.map((ticket) => (
                  <>
                    <tr key={ticket.id} className="hover:bg-apple-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTickets.has(ticket.id)}
                          onChange={() => toggleSelect(ticket.id)}
                          className="w-4 h-4 rounded border-apple-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ChannelIcon channel={ticket.channel} />
                          <div>
                            <span className="font-mono text-sm text-apple-gray-500">{ticket.ticketNumber}</span>
                            <p className="text-sm text-apple-gray-600 font-medium truncate max-w-[200px]">
                              {ticket.subject}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-apple-gray-600">{ticket.customerName}</p>
                        <p className="text-xs text-apple-gray-400">{ticket.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-apple-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          {spamReasonLabels[ticket.spamReason || ""] || ticket.spamReason || "Unbekannt"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => loadTicketContent(ticket.id)}
                            className="p-2 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
                            title="Inhalt anzeigen"
                          >
                            <svg className={`w-4 h-4 transition-transform ${expandedTicket === ticket.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMarkNotSpam([ticket.id])}
                            disabled={processing}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Kein Spam"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete([ticket.id])}
                            disabled={processing}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTicket === ticket.id && (
                      <tr key={`${ticket.id}-content`}>
                        <td colSpan={6} className="px-4 py-4 bg-apple-gray-50">
                          <div className="max-w-3xl">
                            <p className="text-xs text-apple-gray-400 mb-2">Nachrichteninhalt:</p>
                            <div
                              className="text-sm text-apple-gray-600 bg-white p-4 rounded-lg border border-apple-gray-200 max-h-48 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: ticketContent }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 text-center text-sm text-apple-gray-400">
        <p>Spam-Tickets werden nach 30 Tagen automatisch gelöscht</p>
      </div>
    </div>
  );
}
