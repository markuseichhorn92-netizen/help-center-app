"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const CONSENT_KEY = "cookie_consent";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  useEffect(() => {
    // Check if consent was already given
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent) as CookieConsent;
        setConsent(parsed);
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    const consentWithTime = { ...newConsent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTime));
    setConsent(consentWithTime);
    setShowBanner(false);
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const saveSelection = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-apple-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand/10 rounded-apple flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-apple-gray-600">Cookie-Einstellungen</h2>
          </div>
          <p className="text-sm text-apple-gray-500 leading-relaxed">
            Wir verwenden Cookies, um dir die bestmögliche Erfahrung auf unserer Website zu bieten.
            Einige Cookies sind technisch notwendig, während andere uns helfen, die Website zu verbessern.
          </p>
        </div>

        {/* Details Toggle */}
        {showDetails && (
          <div className="px-6 pb-4 space-y-4">
            {/* Necessary Cookies */}
            <div className="p-4 bg-apple-gray-50 rounded-apple-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-apple-gray-600">Notwendige Cookies</span>
                <span className="text-xs text-white bg-apple-gray-400 px-2 py-1 rounded-full">Immer aktiv</span>
              </div>
              <p className="text-xs text-apple-gray-500">
                Diese Cookies sind für die Grundfunktionen der Website erforderlich (z.B. Anmeldung, Navigation).
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="p-4 bg-apple-gray-50 rounded-apple-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-apple-gray-600">Analyse-Cookies</span>
                <button
                  onClick={() => setConsent({ ...consent, analytics: !consent.analytics })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    consent.analytics ? "bg-brand" : "bg-apple-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                      consent.analytics ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-apple-gray-500">
                Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren (anonymisierte Statistiken).
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="p-4 bg-apple-gray-50 rounded-apple-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-apple-gray-600">Marketing-Cookies</span>
                <button
                  onClick={() => setConsent({ ...consent, marketing: !consent.marketing })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    consent.marketing ? "bg-brand" : "bg-apple-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                      consent.marketing ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-apple-gray-500">
                Diese Cookies werden verwendet, um Werbung relevanter für dich zu gestalten.
              </p>
            </div>
          </div>
        )}

        {/* Links */}
        <div className="px-6 pb-4">
          <p className="text-xs text-apple-gray-400">
            Mehr Informationen findest du in unserer{" "}
            <Link href="/datenschutz" className="text-brand hover:underline">
              Datenschutzerklärung
            </Link>
            {" "}und im{" "}
            <Link href="/impressum" className="text-brand hover:underline">
              Impressum
            </Link>.
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 border-t border-apple-gray-100 space-y-3">
          {showDetails ? (
            <button
              onClick={saveSelection}
              className="w-full py-3 bg-brand text-white font-semibold rounded-apple-lg hover:bg-brand-dark transition-colors"
            >
              Auswahl speichern
            </button>
          ) : (
            <button
              onClick={acceptAll}
              className="w-full py-3 bg-brand text-white font-semibold rounded-apple-lg hover:bg-brand-dark transition-colors"
            >
              Alle akzeptieren
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={acceptNecessary}
              className="flex-1 py-2.5 bg-apple-gray-100 text-apple-gray-600 font-medium rounded-apple-lg hover:bg-apple-gray-200 transition-colors text-sm"
            >
              Nur notwendige
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-1 py-2.5 bg-apple-gray-100 text-apple-gray-600 font-medium rounded-apple-lg hover:bg-apple-gray-200 transition-colors text-sm"
            >
              {showDetails ? "Weniger" : "Einstellungen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check cookie consent
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  return consent;
}
