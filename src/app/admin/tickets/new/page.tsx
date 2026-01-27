"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/editor/RichTextEditor";

function NewTicketForm() {
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    subject: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  // Pre-fill from URL params (from contact page)
  useEffect(() => {
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    if (email) {
      setFormData((prev) => ({ ...prev, customerEmail: email }));
    }
    if (name) {
      setFormData((prev) => ({ ...prev, customerName: name }));
    }
  }, [searchParams]);

  // Load contacts for autocomplete
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await fetch("/api/admin/contacts", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      }
    };
    loadContacts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Create ticket
      const res = await fetch("/api/admin/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...formData,
          sendEmail,
          channel: "email",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      const data = await res.json();
      window.location.href = `/admin/tickets/${data.ticket.id}`;
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const selectContact = (contact: { name: string; email: string }) => {
    setFormData((prev) => ({
      ...prev,
      customerName: contact.name,
      customerEmail: contact.email,
    }));
    setShowContactDropdown(false);
    setContactSearch("");
  };

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch) return true;
    const query = contactSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  });

  // AI Functions
  const handleAiCorrect = async () => {
    if (!formData.content.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "ticket_correct",
          content: formData.content,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "KI-Fehler");

      setFormData({ ...formData, content: data.content });
    } catch (err: any) {
      alert("Fehler bei der KI-Korrektur: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiRewrite = async (tone: string) => {
    if (!formData.content.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "ticket_rewrite",
          content: formData.content,
          tone,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setFormData({ ...formData, content: data.content });
    } catch (err) {
      alert("Fehler beim Umschreiben");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCustom = async () => {
    if (!customInstruction.trim()) return;

    setAiLoading(true);
    setShowCustomModal(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "ticket_custom",
          content: formData.content || "",
          instruction: customInstruction,
          ticketInfo: {
            subject: formData.subject,
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "KI-Fehler");
      }

      const data = await res.json();
      setFormData({ ...formData, content: data.content });
      setCustomInstruction("");
    } catch (err: any) {
      alert("Fehler bei der KI-Bearbeitung: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/tickets"
          className="p-2 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Neues Ticket erstellen</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Erstelle ein Ticket und sende optional eine E-Mail</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-apple-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
        {/* Customer Info */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-apple-gray-600 mb-1">Kunde Name *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => {
                setFormData({ ...formData, customerName: e.target.value });
                setContactSearch(e.target.value);
                setShowContactDropdown(true);
              }}
              onFocus={() => setShowContactDropdown(true)}
              required
              className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              placeholder="Max Mustermann"
            />
            {/* Contact Dropdown */}
            {showContactDropdown && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-apple-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredContacts.slice(0, 5).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => selectContact(contact)}
                    className="w-full px-4 py-3 text-left hover:bg-apple-gray-50 flex items-center gap-3 border-b border-apple-gray-100 last:border-0"
                  >
                    <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center text-brand text-sm font-semibold">
                      {contact.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-apple-gray-600">{contact.name}</p>
                      <p className="text-xs text-apple-gray-400">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-1">Kunde E-Mail *</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              placeholder="max@beispiel.de"
            />
          </div>
        </div>

        {/* Subject */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-600 mb-1">Betreff *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
            className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            placeholder="Betreff der Nachricht"
          />
        </div>

        {/* Priority */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-600 mb-2">Priorität</label>
          <div className="flex gap-3">
            {[
              { value: "low", label: "Niedrig", color: "bg-gray-100 text-gray-600 ring-gray-300" },
              { value: "medium", label: "Normal", color: "bg-blue-100 text-blue-600 ring-blue-300" },
              { value: "high", label: "Hoch", color: "bg-red-100 text-red-600 ring-red-300" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setFormData({ ...formData, priority: p.value as "low" | "medium" | "high" })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  formData.priority === p.value
                    ? `${p.color} ring-2`
                    : "bg-apple-gray-100 text-apple-gray-500 hover:bg-apple-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content with AI Tools */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-600 mb-1">Nachricht *</label>

          {/* AI Tools Bar */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-apple-gray-400 font-medium hidden sm:inline">KI-Assistent:</span>

            {/* Desktop: Individual Buttons */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {formData.content.trim() ? "KI-Anweisung" : "Mit KI erstellen"}
              </button>

              <button
                type="button"
                onClick={handleAiCorrect}
                disabled={aiLoading || !formData.content.trim()}
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
                  disabled={aiLoading || !formData.content.trim()}
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
                    <button type="button" onClick={() => handleAiRewrite("formal")} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50">Formeller</button>
                    <button type="button" onClick={() => handleAiRewrite("friendly")} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50">Freundlicher</button>
                    <button type="button" onClick={() => handleAiRewrite("short")} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50">Kürzer</button>
                    <button type="button" onClick={() => handleAiRewrite("detailed")} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50">Ausführlicher</button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Dropdown Menu */}
            <div className="sm:hidden relative">
              <button
                type="button"
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                KI-Assistent
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showAiMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-apple-gray-200 py-1 z-10 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => { setShowCustomModal(true); setShowAiMenu(false); }}
                    disabled={aiLoading}
                    className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {formData.content.trim() ? "KI-Anweisung" : "Mit KI erstellen"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAiCorrect}
                    disabled={aiLoading || !formData.content.trim()}
                    className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Korrigieren
                  </button>
                  <div className="border-t border-apple-gray-100 my-1"></div>
                  <button type="button" onClick={() => handleAiRewrite("formal")} disabled={aiLoading || !formData.content.trim()} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50">Formeller umschreiben</button>
                  <button type="button" onClick={() => handleAiRewrite("friendly")} disabled={aiLoading || !formData.content.trim()} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50">Freundlicher umschreiben</button>
                  <button type="button" onClick={() => handleAiRewrite("short")} disabled={aiLoading || !formData.content.trim()} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50">Kürzer umschreiben</button>
                  <button type="button" onClick={() => handleAiRewrite("detailed")} disabled={aiLoading || !formData.content.trim()} className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50">Ausführlicher umschreiben</button>
                </div>
              )}
            </div>

            {aiLoading && (
              <span className="inline-flex items-center gap-2 text-xs text-purple-600">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">KI arbeitet...</span>
              </span>
            )}
          </div>

          <RichTextEditor
            value={formData.content}
            onChange={(html) => setFormData({ ...formData, content: html })}
            variant="ticket"
            placeholder="Schreibe deine Nachricht an den Kunden..."
          />
        </div>

        {/* Send Email Option */}
        <div className="mb-6 p-4 bg-apple-gray-50 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-5 h-5 text-brand bg-white border-apple-gray-300 rounded focus:ring-brand focus:ring-2"
            />
            <div>
              <span className="text-sm font-medium text-apple-gray-600">E-Mail senden</span>
              <p className="text-xs text-apple-gray-400">Die Nachricht wird per E-Mail an den Kunden gesendet</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-apple-gray-100">
          <Link
            href="/admin/tickets"
            className="flex-1 px-4 py-2.5 text-center text-apple-gray-600 font-medium rounded-xl hover:bg-apple-gray-100 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving || !formData.content.trim()}
            className="flex-1 px-4 py-2.5 bg-brand text-white font-medium rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Erstellen...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {sendEmail ? "Ticket erstellen & senden" : "Ticket erstellen"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Click outside to close dropdown */}
      {showContactDropdown && (
        <div className="fixed inset-0 z-5" onClick={() => setShowContactDropdown(false)} />
      )}

      {/* Click outside to close AI menu */}
      {showAiMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)} />
      )}

      {/* Custom AI Instruction Modal */}
      {showCustomModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 animate-fade-in backdrop-blur-sm"
            onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[90vh] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-xl sm:w-full sm:mx-4 sm:max-h-[80vh]">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-fade-in flex flex-col max-h-[90vh] sm:max-h-[80vh]">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-apple-gray-100">
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-brand flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">KI-Assistent</h3>
                      <p className="text-xs text-apple-gray-400">Nachricht erstellen oder bearbeiten</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {/* Ticket Context */}
                {(formData.customerName || formData.subject) && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Kontext</p>
                    <div className="bg-apple-gray-50 rounded-xl p-3 space-y-1">
                      {formData.customerName && (
                        <p className="text-sm text-apple-gray-600"><span className="text-apple-gray-400">Kunde:</span> {formData.customerName}</p>
                      )}
                      {formData.subject && (
                        <p className="text-sm text-apple-gray-600"><span className="text-apple-gray-400">Betreff:</span> {formData.subject}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Schnellaktionen</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Freundlich begrüßen", icon: "👋" },
                      { label: "Information anfordern", icon: "❓" },
                      { label: "Termin vorschlagen", icon: "📅" },
                      { label: "Danke sagen", icon: "🙏" },
                    ].map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomInstruction(action.label)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-full border transition-all ${
                          customInstruction === action.label
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-apple-gray-200 text-apple-gray-600 hover:border-apple-gray-300 hover:bg-apple-gray-50'
                        }`}
                      >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Instruction Input */}
                <div>
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">
                    {formData.content.trim() ? "Text bearbeiten" : "Neue Nachricht erstellen"}
                  </p>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder={formData.content.trim()
                      ? "Beschreibe, wie der Text geändert werden soll..."
                      : "Beschreibe, was du schreiben möchtest..."}
                    rows={4}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none text-base bg-white"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-apple-gray-100 px-5 py-4 sm:px-6 bg-apple-gray-50/50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="flex-1 sm:flex-none px-5 py-3 text-apple-gray-600 font-medium rounded-xl border border-apple-gray-200 hover:bg-white transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleAiCustom}
                    disabled={!customInstruction.trim()}
                    className="flex-[2] sm:flex-1 px-5 py-3 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {formData.content.trim() ? "Text bearbeiten" : "Nachricht generieren"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-apple-gray-400">Laden...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}
