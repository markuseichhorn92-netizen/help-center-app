"use client";

import { useState } from "react";
import Link from "next/link";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    subject: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Fehler beim Senden");
      }

      setTicketNumber(data.ticketNumber);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-apple-gray-600 mb-3">
            Anfrage erfolgreich gesendet!
          </h1>
          <p className="text-apple-gray-500 mb-6">
            Vielen Dank für Ihre Nachricht. Wir werden uns schnellstmöglich bei Ihnen melden.
          </p>
          <div className="bg-apple-gray-50 rounded-apple-lg p-4 mb-6">
            <p className="text-sm text-apple-gray-400 mb-1">Ihre Ticket-Nummer</p>
            <p className="text-2xl font-mono font-bold text-brand">{ticketNumber}</p>
          </div>
          <p className="text-sm text-apple-gray-400 mb-6">
            Bitte bewahren Sie diese Nummer auf, um den Status Ihrer Anfrage zu verfolgen.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-brand hover:text-brand-dark font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zum Hilfe-Center
          </Link>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-apple-gray-600 tracking-tight mb-3">
          Kontakt & Support
        </h1>
        <p className="text-lg text-apple-gray-400 max-w-2xl mx-auto">
          Sie haben eine Frage oder benötigen Hilfe? Füllen Sie das Formular aus und unser Team meldet sich bei Ihnen.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-apple-lg flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Name & Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-apple-gray-600 mb-2">
                  Ihr Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-apple-gray-600 mb-2">
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  required
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200"
                  placeholder="max@beispiel.de"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-apple-gray-600 mb-2">
                Betreff *
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200"
                placeholder="Kurze Beschreibung Ihres Anliegens"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-2">
                Priorität
              </label>
              <div className="flex gap-4 flex-wrap">
                {[
                  { value: "low", label: "Niedrig", color: "bg-gray-100 text-gray-600 ring-gray-300" },
                  { value: "medium", label: "Normal", color: "bg-blue-50 text-blue-600 ring-blue-300" },
                  { value: "high", label: "Hoch", color: "bg-red-50 text-red-600 ring-red-300" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex-1 min-w-[120px] text-center px-4 py-2 rounded-apple-lg cursor-pointer transition-all duration-200 ring-1 ring-inset ${
                      formData.priority === option.value
                        ? option.color + " ring-2"
                        : "bg-apple-gray-50 text-apple-gray-500 ring-apple-gray-200 hover:bg-apple-gray-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={option.value}
                      checked={formData.priority === option.value}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-apple-gray-600 mb-2">
                Ihre Nachricht *
              </label>
              <textarea
                id="content"
                required
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all duration-200 resize-none"
                placeholder="Beschreiben Sie Ihr Anliegen so detailliert wie möglich..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird gesendet...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Anfrage absenden
                </>
              )}
            </button>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-apple-gray-400">
          <p>
            Sie erhalten eine Bestätigung per E-Mail. Unser Team antwortet in der Regel innerhalb von 24 Stunden.
          </p>
        </div>
      </div>
    </div>
  );
}
