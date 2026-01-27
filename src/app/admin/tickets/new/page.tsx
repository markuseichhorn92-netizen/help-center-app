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

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-apple-gray-600 mb-1">Nachricht *</label>
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
