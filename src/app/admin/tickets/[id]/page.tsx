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

interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  sender: "customer" | "admin";
  senderName: string;
  senderEmail: string;
  createdAt: string;
  attachments?: Attachment[];
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
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          attachments: attachments,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Fehler beim Senden");

      if (data.emailError) {
        alert(`Nachricht gespeichert, aber E-Mail-Versand fehlgeschlagen: ${data.emailError}`);
      }

      setMessages([...messages, data.message || data]);
      setReplyContent("");
      setAttachments([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            Authorization: getAuthHeader(),
          },
          body: formData,
        });

        if (res.ok) {
          const attachment = await res.json();
          setAttachments(prev => [...prev, attachment]);
        } else {
          const data = await res.json();
          alert(`Fehler beim Hochladen von ${file.name}: ${data.message}`);
        }
      }
    } catch (err) {
      alert('Fehler beim Hochladen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // AI Functions
  const handleAiGenerate = async () => {
    if (!ticket || messages.length === 0) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const lastCustomerMessage = [...messages].reverse().find(m => m.sender === "customer");

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_reply",
          customerMessage: lastCustomerMessage?.content || ticket.subject,
          customerName: ticket.customerName,
          ticketSubject: ticket.subject,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setReplyContent(data.content);
    } catch (err) {
      alert("Fehler bei der KI-Generierung");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCorrect = async () => {
    if (!replyContent.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_correct",
          content: replyContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "KI-Fehler");
      }

      setReplyContent(data.content);
    } catch (err: any) {
      alert("Fehler bei der KI-Korrektur: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiRewrite = async (tone: string) => {
    if (!replyContent.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_rewrite",
          content: replyContent,
          tone,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setReplyContent(data.content);
    } catch (err) {
      alert("Fehler beim Umschreiben");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCustom = async () => {
    if (!replyContent.trim() || !customInstruction.trim()) return;

    setAiLoading(true);
    setShowCustomModal(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_custom",
          content: replyContent,
          instruction: customInstruction,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setReplyContent(data.content);
      setCustomInstruction("");
    } catch (err) {
      alert("Fehler bei der KI-Bearbeitung");
    } finally {
      setAiLoading(false);
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
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className={`text-xs mb-2 ${msg.sender === "admin" ? "text-white/70" : "text-apple-gray-500"}`}>
                          {msg.attachments.length} Anhang/Anhänge:
                        </p>
                        <div className="space-y-1">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-sm ${
                                msg.sender === "admin"
                                  ? "text-white/90 hover:text-white"
                                  : "text-brand hover:text-brand-dark"
                              }`}
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate">{att.filename}</span>
                              <span className={`text-xs ${msg.sender === "admin" ? "text-white/50" : "text-apple-gray-400"}`}>
                                ({formatFileSize(att.size)})
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <div className="border-t border-apple-gray-100 p-4">
              <form onSubmit={handleSendReply}>
                {/* AI Tools Bar */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs text-apple-gray-400 font-medium">KI-Assistent:</span>

                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Antwort generieren
                  </button>

                  <button
                    type="button"
                    onClick={handleAiCorrect}
                    disabled={aiLoading || !replyContent.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Korrigieren
                  </button>

                  {/* Rewrite Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAiMenu(!showAiMenu)}
                      disabled={aiLoading || !replyContent.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Umschreiben
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAiMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-apple-gray-200 py-1 z-10 min-w-[160px]">
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("formal")}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                        >
                          Formeller
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("friendly")}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                        >
                          Freundlicher
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("short")}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                        >
                          Kürzer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("detailed")}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                        >
                          Ausführlicher
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCustomModal(true)}
                    disabled={aiLoading || !replyContent.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Eigene Anweisung
                  </button>

                  {aiLoading && (
                    <span className="inline-flex items-center gap-2 text-xs text-purple-600">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      KI arbeitet...
                    </span>
                  )}
                </div>

                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Antwort schreiben..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200 resize-none"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-3 p-3 bg-apple-gray-50 rounded-apple-lg">
                    <p className="text-xs text-apple-gray-500 mb-2">{attachments.length} Anhang/Anhänge:</p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-apple-gray-200 text-sm"
                        >
                          <svg className="w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="truncate max-w-[150px]">{att.filename}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="text-apple-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-apple-gray-500">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="rounded border-apple-gray-300 text-brand focus:ring-brand"
                      />
                      Auch per E-Mail senden
                    </label>

                    {/* File Upload Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-apple-gray-500 hover:text-apple-gray-700 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                      Datei anhängen
                    </button>
                  </div>
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

      {/* Custom AI Instruction Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20">
          <div className="bg-white rounded-apple-xl shadow-2xl p-6 max-w-lg mx-4 w-full">
            <h3 className="text-lg font-semibold text-apple-gray-600 mb-4">Eigene KI-Anweisung</h3>
            <p className="text-sm text-apple-gray-400 mb-4">
              Beschreibe, wie die KI deinen Text bearbeiten soll.
            </p>
            <textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="z.B. 'Füge eine Entschuldigung hinzu' oder 'Erkläre die Öffnungszeiten genauer'"
              rows={3}
              className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all mb-4 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                className="px-4 py-2 text-apple-gray-600 font-medium rounded-full hover:bg-apple-gray-100 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleAiCustom}
                disabled={!customInstruction.trim()}
                className="px-4 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                Anwenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close AI menu */}
      {showAiMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)} />
      )}
    </div>
  );
}
