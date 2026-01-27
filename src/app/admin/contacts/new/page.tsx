"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }

      const data = await res.json();
      router.push(`/admin/contacts/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/contacts"
          className="p-2 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Neuer Kontakt</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Erstelle einen neuen Kontakt</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-1">E-Mail *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              placeholder="max@beispiel.de"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-apple-gray-600 mb-1">Telefon</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            placeholder="+49 123 456789"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-apple-gray-600 mb-1">Notizen</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-apple-gray-200 rounded-xl text-apple-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none"
            placeholder="Interne Notizen zum Kontakt..."
          />
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-apple-gray-100">
          <Link
            href="/admin/contacts"
            className="flex-1 px-4 py-2.5 text-center text-apple-gray-600 font-medium rounded-xl hover:bg-apple-gray-100 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving}
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
                Kontakt erstellen
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
