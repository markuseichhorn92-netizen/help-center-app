"use client";

import { useState } from "react";
import Image from "next/image";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/portal/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          ticketNumber: ticketNumber.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  // Get error message from URL params
  const getUrlError = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");

    switch (errorParam) {
      case "missing_token":
        return "Ungültiger Link. Bitte fordern Sie einen neuen Zugangslink an.";
      case "invalid_token":
        return "Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.";
      case "verification_failed":
        return "Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.";
      default:
        return null;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-apple-xl shadow-card p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-apple-gray-600 mb-3">
              E-Mail gesendet
            </h2>
            <p className="text-apple-gray-400 mb-6">
              Wir haben einen Zugangslink an{" "}
              <span className="font-medium text-apple-gray-500">{email}</span>{" "}
              gesendet. Bitte prüfen Sie Ihr Postfach.
            </p>
            <div className="bg-apple-gray-50 rounded-apple p-4 text-sm text-apple-gray-400">
              <p>
                Der Link ist 7 Tage gültig. Sollten Sie keine E-Mail erhalten haben,
                prüfen Sie bitte Ihren Spam-Ordner.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setTicketNumber("");
              }}
              className="mt-6 text-brand hover:text-brand-dark transition-colors text-sm font-medium"
            >
              Anderen Zugang anfordern
            </button>
          </div>
        </div>
      </div>
    );
  }

  const urlError = getUrlError();

  return (
    <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-apple-lg shadow-card p-4 mb-6">
            <Image
              src="https://cdn.sanity.io/images/6qiktmvm/production/e33b949b11d3aa8b60befb3f5f537803a8c48700-2917x486.png"
              alt="FIT INN Logo"
              width={140}
              height={24}
              className="h-6 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-apple-gray-600 mb-2">
            Kundenportal
          </h1>
          <p className="text-apple-gray-400">
            Verfolgen Sie den Status Ihrer Tickets
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-apple-xl shadow-card p-8">
          {(error || urlError) && (
            <div className="bg-red-50 border border-red-200 rounded-apple p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-red-700">{error || urlError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-apple-gray-500 mb-2"
              >
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ihre@email.de"
                className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-apple-gray-600"
              />
              <p className="mt-1.5 text-xs text-apple-gray-300">
                Die E-Mail-Adresse, mit der Sie das Ticket erstellt haben
              </p>
            </div>

            <div>
              <label
                htmlFor="ticketNumber"
                className="block text-sm font-medium text-apple-gray-500 mb-2"
              >
                Ticketnummer{" "}
                <span className="text-apple-gray-300 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="ticketNumber"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                placeholder="TKT-001"
                className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-apple-gray-600 font-mono"
              />
              <p className="mt-1.5 text-xs text-apple-gray-300">
                Lassen Sie das Feld leer, um alle Ihre Tickets zu sehen
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-gradient-to-r from-brand to-brand-dark text-white py-3.5 px-6 rounded-apple-lg font-semibold hover:from-brand-dark hover:to-[#052530] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Wird gesendet...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Zugangslink anfordern</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-apple-gray-100">
            <div className="flex items-start gap-3 text-sm text-apple-gray-400">
              <svg
                className="w-5 h-5 text-brand flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p>
                Wir senden Ihnen einen sicheren Link per E-Mail. Kein Passwort
                erforderlich.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-apple-gray-300">
          <p>
            Probleme beim Zugang?{" "}
            <a
              href="mailto:support@fit-inn-trier.de"
              className="text-brand hover:text-brand-dark transition-colors"
            >
              Kontaktieren Sie uns
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
