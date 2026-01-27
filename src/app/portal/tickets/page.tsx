"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Offen", color: "text-blue-700", bg: "bg-blue-100" },
  in_progress: { label: "In Bearbeitung", color: "text-yellow-700", bg: "bg-yellow-100" },
  resolved: { label: "Gelöst", color: "text-green-700", bg: "bg-green-100" },
  closed: { label: "Geschlossen", color: "text-gray-600", bg: "bg-gray-100" },
};

const channelIcons: Record<string, React.ReactNode> = {
  email: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  whatsapp: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  web: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
};

export default function PortalTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch("/api/portal/tickets");

        if (response.status === 401) {
          router.push("/portal");
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Fehler beim Laden der Tickets");
          return;
        }

        const data = await response.json();
        setTickets(data.tickets);
      } catch {
        setError("Verbindungsfehler");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;

    return date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "all") return true;
    if (filter === "active") return ["open", "in_progress"].includes(ticket.status);
    if (filter === "resolved") return ["resolved", "closed"].includes(ticket.status);
    return ticket.status === filter;
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors
    }
    router.push("/portal");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-apple-gray-400">Tickets werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-apple-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="FIT INN"
                width={100}
                height={25}
                className="h-6 w-auto"
              />
              <span className="text-apple-gray-300">|</span>
              <h1 className="text-lg font-semibold text-apple-gray-600">Meine Tickets</h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-apple-gray-400 hover:text-apple-gray-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-white rounded-apple-xl shadow-card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-apple-gray-600 mb-3">{error}</h2>
            <Link href="/portal" className="text-brand hover:text-brand-dark transition-colors">
              Zurück zum Portal
            </Link>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-apple-xl shadow-card p-8 text-center">
            <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-apple-gray-600 mb-3">Keine Tickets gefunden</h2>
            <p className="text-apple-gray-400 mb-6">
              Sie haben noch keine Support-Anfragen gestellt.
            </p>
            <a
              href="mailto:support@fit-inn-trier.de"
              className="inline-block bg-brand text-white px-6 py-3 rounded-apple-lg font-medium hover:bg-brand-dark transition-colors"
            >
              Support kontaktieren
            </a>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { key: "all", label: "Alle", count: tickets.length },
                { key: "active", label: "Aktiv", count: tickets.filter(t => ["open", "in_progress"].includes(t.status)).length },
                { key: "resolved", label: "Gelöst", count: tickets.filter(t => ["resolved", "closed"].includes(t.status)).length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-apple-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === tab.key
                      ? "bg-brand text-white"
                      : "bg-white text-apple-gray-500 hover:bg-apple-gray-100"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    filter === tab.key
                      ? "bg-white/20"
                      : "bg-apple-gray-100"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const status = statusLabels[ticket.status] || statusLabels.open;
                const channel = ticket.channel || "web";

                return (
                  <Link
                    key={ticket.id}
                    href={`/portal/ticket/${ticket.id}`}
                    className="block bg-white rounded-apple-lg shadow-card hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`p-2 rounded-apple ${status.bg} flex-shrink-0`}>
                        {ticket.status === "open" || ticket.status === "in_progress" ? (
                          <svg className={`w-5 h-5 ${status.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 ${status.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-brand">
                            {ticket.ticketNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="text-apple-gray-300" title={channel}>
                            {channelIcons[channel] || channelIcons.web}
                          </span>
                        </div>
                        <h3 className="font-medium text-apple-gray-600 truncate">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-apple-gray-400 mt-1">
                          Aktualisiert: {formatDate(ticket.updatedAt)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-apple-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-apple-gray-400">
                Keine Tickets in dieser Kategorie
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
