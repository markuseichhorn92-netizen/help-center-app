"use client";

import { useState, useEffect } from "react";

interface SpamStats {
  total: number;
  byReason: Record<string, number>;
  recentAttempts: Array<{
    email: string;
    reason: string;
    ip: string;
    timestamp: string;
  }>;
}

interface SpamData {
  blockedEmails: string[];
  blockedDomains: string[];
  stats?: SpamStats;
}

const reasonLabels: Record<string, string> = {
  honeypot: "Bot (Honeypot)",
  blocked_email: "Blockierte E-Mail",
  blocked_domain: "Blockierte Domain",
  disposable_email: "Wegwerf-E-Mail",
  rate_limit_email: "Rate-Limit (E-Mail)",
  rate_limit_ip: "Rate-Limit (IP)",
  content_spam: "Spam-Inhalt",
};

export default function SpamPage() {
  const [data, setData] = useState<SpamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/spam?includeStats=true", {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToBlocklist = async (type: "email" | "domain", value: string) => {
    if (!value.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/spam", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: value.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler");
      }

      // Refresh data
      await loadData();
      if (type === "email") setNewEmail("");
      else setNewDomain("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Fehler");
    } finally {
      setAdding(false);
    }
  };

  const removeFromBlocklist = async (type: "email" | "domain", value: string) => {
    try {
      const res = await fetch(
        `/api/admin/spam?type=${type}&value=${encodeURIComponent(value)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!res.ok) throw new Error("Fehler beim Entfernen");

      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Fehler");
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
            <span className="text-lg">Wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg">
          Fehler: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">
          Spam-Schutz
        </h1>
        <p className="text-apple-gray-400 text-sm mt-1">
          Blockierte Adressen und Spam-Statistiken verwalten
        </p>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-apple flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-apple-gray-400">Blockiert (gesamt)</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-apple flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-apple-gray-400">Rate-Limits</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(data.stats.byReason.rate_limit_email || 0) +
                    (data.stats.byReason.rate_limit_ip || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-apple flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-apple-gray-400">Bots erkannt</p>
                <p className="text-2xl font-bold text-purple-600">
                  {data.stats.byReason.honeypot || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-apple flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-apple-gray-400">Wegwerf-Mails</p>
                <p className="text-2xl font-bold text-amber-600">
                  {data.stats.byReason.disposable_email || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Blocked Emails */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-apple-gray-100 bg-apple-gray-50">
            <h2 className="font-semibold text-apple-gray-600">
              Blockierte E-Mail-Adressen
            </h2>
            <p className="text-sm text-apple-gray-400 mt-1">
              Diese Adressen können keine Tickets erstellen
            </p>
          </div>

          {/* Add new */}
          <div className="px-6 py-4 border-b border-apple-gray-100">
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="spam@example.com"
                className="flex-1 px-4 py-2 border border-apple-gray-200 rounded-apple focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addToBlocklist("email", newEmail);
                }}
              />
              <button
                onClick={() => addToBlocklist("email", newEmail)}
                disabled={adding || !newEmail.trim()}
                className="px-4 py-2 bg-brand text-white rounded-apple font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                Hinzufügen
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {data?.blockedEmails.length === 0 ? (
              <div className="px-6 py-8 text-center text-apple-gray-400">
                Keine E-Mails blockiert
              </div>
            ) : (
              <ul className="divide-y divide-apple-gray-100">
                {data?.blockedEmails.map((email) => (
                  <li
                    key={email}
                    className="px-6 py-3 flex items-center justify-between hover:bg-apple-gray-50"
                  >
                    <span className="text-sm text-apple-gray-600 font-mono">
                      {email}
                    </span>
                    <button
                      onClick={() => removeFromBlocklist("email", email)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Blocked Domains */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-apple-gray-100 bg-apple-gray-50">
            <h2 className="font-semibold text-apple-gray-600">
              Blockierte Domains
            </h2>
            <p className="text-sm text-apple-gray-400 mt-1">
              Alle Adressen dieser Domains werden blockiert
            </p>
          </div>

          {/* Add new */}
          <div className="px-6 py-4 border-b border-apple-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="spamdomain.com"
                className="flex-1 px-4 py-2 border border-apple-gray-200 rounded-apple focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addToBlocklist("domain", newDomain);
                }}
              />
              <button
                onClick={() => addToBlocklist("domain", newDomain)}
                disabled={adding || !newDomain.trim()}
                className="px-4 py-2 bg-brand text-white rounded-apple font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                Hinzufügen
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {data?.blockedDomains.length === 0 ? (
              <div className="px-6 py-8 text-center text-apple-gray-400">
                Keine Domains blockiert
              </div>
            ) : (
              <ul className="divide-y divide-apple-gray-100">
                {data?.blockedDomains.map((domain) => (
                  <li
                    key={domain}
                    className="px-6 py-3 flex items-center justify-between hover:bg-apple-gray-50"
                  >
                    <span className="text-sm text-apple-gray-600 font-mono">
                      @{domain}
                    </span>
                    <button
                      onClick={() => removeFromBlocklist("domain", domain)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attempts */}
      {data?.stats?.recentAttempts && data.stats.recentAttempts.length > 0 && (
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-apple-gray-100 bg-apple-gray-50">
            <h2 className="font-semibold text-apple-gray-600">
              Letzte Spam-Versuche
            </h2>
            <p className="text-sm text-apple-gray-400 mt-1">
              Blockierte Anfragen der letzten 30 Tage
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">
                    Zeitpunkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">
                    E-Mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">
                    IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">
                    Grund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-apple-gray-400 uppercase">
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100">
                {data.stats.recentAttempts.map((attempt, idx) => (
                  <tr key={idx} className="hover:bg-apple-gray-50">
                    <td className="px-6 py-3 text-sm text-apple-gray-500">
                      {new Date(attempt.timestamp).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3 text-sm text-apple-gray-600 font-mono">
                      {attempt.email}
                    </td>
                    <td className="px-6 py-3 text-sm text-apple-gray-400 font-mono">
                      {attempt.ip}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        {reasonLabels[attempt.reason] || attempt.reason}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {!data.blockedEmails.includes(attempt.email.toLowerCase()) && (
                        <button
                          onClick={() => addToBlocklist("email", attempt.email)}
                          className="text-xs text-brand hover:text-brand-dark font-medium"
                        >
                          Blockieren
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-apple-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Spam-Schutz-Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Rate-Limiting:</strong> Max. 5 Tickets/Stunde pro E-Mail, 10/Stunde pro IP</li>
          <li>• <strong>Wegwerf-E-Mails:</strong> Bekannte Dienste wie 10minutemail.com werden automatisch blockiert</li>
          <li>• <strong>Honeypot:</strong> Verstecktes Formularfeld erkennt Bots</li>
          <li>• <strong>Content-Analyse:</strong> Spam-Keywords und übermäßige Links werden erkannt</li>
          <li>• <strong>Blocklisten:</strong> Manuelle Blockierung von E-Mails und Domains</li>
        </ul>
      </div>
    </div>
  );
}
