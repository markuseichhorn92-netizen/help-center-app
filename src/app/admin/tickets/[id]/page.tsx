"use client";

import Link from "next/link";
import { useState, useEffect, useRef, use } from "react";

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

interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  sender: "customer" | "admin";
  senderName: string;
  senderEmail: string;
  createdAt: string;
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

function getAuthHeader() {
  return `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/admin/tickets/${id}`, {
          headers: { Authorization: getAuthHeader() }
        }),
        fetch(`/api/admin/tickets/${id}/messages`, {
          headers: { Authorization: getAuthHeader() }
        })
      ]);

      if (!ticketRes.ok) {
        throw new Error("Ticket nicht gefunden");
      }

      const ticketData = await ticketRes.json();
      const messagesData = await messagesRes.json();

      setTicket(ticketData);
      setMessages(messagesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStatusChange = async (newStatus: Ticket["status"]) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      const updatedTicket = await res.json();
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePriorityChange = async (newPriority: Ticket["priority"]) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      const updatedTicket = await res.json();
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !ticket) return;

    setSending(true);
    try {
      const endpoint = sendEmail
        ? `/api/admin/tickets/${id}/reply`
        : `/api/admin/tickets/${id}/messages`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          content: replyContent,
          senderName: "Support Team",
        }),
      });

      if (!res.ok) throw new Error("Fehler beim Senden");

      const newMessage = await res.json();
      setMessages([...messages, newMessage.message || newMessage]);
      setReplyContent("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Ticket wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });

      if (!res.ok) throw new Error("Fehler beim Löschen");

      window.location.href = "/admin/tickets";
    } catch (err: any) {
      alert(err.message);
    }
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
            <span className="text-lg">Ticket wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error || "Ticket nicht gefunden"}</span>
          </div>
        </div>
        <Link href="/admin/tickets" className="mt-4 inline-flex items-center gap-2 text-brand hover:text-brand-dark">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/tickets" className="text-apple-gray-400 hover:text-brand transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <span className="text-sm font-mono text-apple-gray-400">{ticket.ticketNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-apple-gray-600 ml-8">{ticket.subject}</h1>
        </div>
        <button
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-700 transition-colors self-start lg:self-center"
        >
          Ticket löschen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
            {/* Messages */}
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-apple-lg p-4 ${
                      msg.sender === "admin"
                        ? "bg-brand text-white"
                        : "bg-apple-gray-100 text-apple-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-medium ${msg.sender === "admin" ? "text-white/90" : "text-apple-gray-500"}`}>
                        {msg.senderName}
                      </span>
                      <span className={`text-xs ${msg.sender === "admin" ? "text-white/60" : "text-apple-gray-400"}`}>
                        {new Date(msg.createdAt).toLocaleString("de-DE", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <div className="border-t border-apple-gray-100 p-4">
              <form onSubmit={handleSendReply}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Antwort schreiben..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200 resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-sm text-apple-gray-500">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded border-apple-gray-300 text-brand focus:ring-brand"
                    />
                    Auch per E-Mail senden
                  </label>
                  <button
                    type="submit"
                    disabled={sending || !replyContent.trim()}
                    className="px-5 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Senden...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Senden
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Status</h3>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as Ticket["status"])}
              className="w-full px-3 py-2 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
            >
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Priorität</h3>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value as Ticket["priority"])}
              className="w-full px-3 py-2 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
            >
              {Object.entries(priorityConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Kunde</h3>
            <div className="space-y-2">
              <p className="text-apple-gray-600 font-medium">{ticket.customerName}</p>
              <a
                href={`mailto:${ticket.customerEmail}`}
                className="text-brand hover:text-brand-dark text-sm break-all"
              >
                {ticket.customerEmail}
              </a>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Zeitstempel</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-apple-gray-400">Erstellt:</span>
                <span className="text-apple-gray-600">
                  {new Date(ticket.createdAt).toLocaleString("de-DE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-apple-gray-400">Aktualisiert:</span>
                <span className="text-apple-gray-600">
                  {new Date(ticket.updatedAt).toLocaleString("de-DE")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
