"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
      // Small delay for smoother UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      try {
        const parsed = JSON.parse(savedConsent) as CookieConsent;
        setConsent(parsed);
      } catch {
        setTimeout(() => setShowBanner(true), 1000);
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

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={acceptNecessary}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-dark-surface rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  className="w-10 h-10 bg-brand/10 dark:bg-brand-light/20 rounded-xl flex items-center justify-center"
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <svg className="w-5 h-5 text-brand dark:text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </motion.div>
                <motion.h2
                  className="text-xl font-bold text-apple-gray-600 dark:text-dark-text"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Cookie-Einstellungen
                </motion.h2>
              </div>
              <motion.p
                className="text-sm text-apple-gray-500 dark:text-dark-text-secondary leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Wir verwenden Cookies, um dir die bestmögliche Erfahrung auf unserer Website zu bieten.
                Einige Cookies sind technisch notwendig, während andere uns helfen, die Website zu verbessern.
              </motion.p>
            </div>

            {/* Details Section */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  className="px-6 pb-4 space-y-3 overflow-y-auto max-h-64"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Necessary Cookies */}
                  <motion.div
                    className="p-4 bg-apple-gray-50 dark:bg-dark-surface-elevated rounded-xl"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-apple-gray-600 dark:text-dark-text">Notwendige Cookies</span>
                      <span className="text-xs text-white bg-apple-gray-400 px-2 py-1 rounded-full">Immer aktiv</span>
                    </div>
                    <p className="text-xs text-apple-gray-500 dark:text-dark-text-secondary">
                      Diese Cookies sind für die Grundfunktionen der Website erforderlich (z.B. Anmeldung, Navigation).
                    </p>
                  </motion.div>

                  {/* Analytics Cookies */}
                  <motion.div
                    className="p-4 bg-apple-gray-50 dark:bg-dark-surface-elevated rounded-xl"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-apple-gray-600 dark:text-dark-text">Analyse-Cookies</span>
                      <motion.button
                        onClick={() => setConsent({ ...consent, analytics: !consent.analytics })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          consent.analytics ? "bg-brand" : "bg-apple-gray-300 dark:bg-dark-border"
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.span
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                          animate={{ x: consent.analytics ? 26 : 4 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <p className="text-xs text-apple-gray-500 dark:text-dark-text-secondary">
                      Diese Cookies helfen uns zu verstehen, wie Besucher mit der Website interagieren (anonymisierte Statistiken).
                    </p>
                  </motion.div>

                  {/* Marketing Cookies */}
                  <motion.div
                    className="p-4 bg-apple-gray-50 dark:bg-dark-surface-elevated rounded-xl"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-apple-gray-600 dark:text-dark-text">Marketing-Cookies</span>
                      <motion.button
                        onClick={() => setConsent({ ...consent, marketing: !consent.marketing })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          consent.marketing ? "bg-brand" : "bg-apple-gray-300 dark:bg-dark-border"
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.span
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                          animate={{ x: consent.marketing ? 26 : 4 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <p className="text-xs text-apple-gray-500 dark:text-dark-text-secondary">
                      Diese Cookies werden verwendet, um Werbung relevanter für dich zu gestalten.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Links */}
            <div className="px-6 pb-4">
              <p className="text-xs text-apple-gray-400 dark:text-dark-text-secondary">
                Mehr Informationen findest du in unserer{" "}
                <Link href="/datenschutz" className="text-brand dark:text-brand-light hover:underline">
                  Datenschutzerklärung
                </Link>
                {" "}und im{" "}
                <Link href="/impressum" className="text-brand dark:text-brand-light hover:underline">
                  Impressum
                </Link>.
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 border-t border-apple-gray-100 dark:border-dark-border space-y-3">
              <motion.button
                onClick={showDetails ? saveSelection : acceptAll}
                className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showDetails ? 'Auswahl speichern' : 'Alle akzeptieren'}
              </motion.button>

              <div className="flex gap-3">
                <motion.button
                  onClick={acceptNecessary}
                  className="flex-1 py-2.5 bg-apple-gray-100 dark:bg-dark-surface-elevated text-apple-gray-600 dark:text-dark-text font-medium rounded-xl hover:bg-apple-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Nur notwendige
                </motion.button>
                <motion.button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex-1 py-2.5 bg-apple-gray-100 dark:bg-dark-surface-elevated text-apple-gray-600 dark:text-dark-text font-medium rounded-xl hover:bg-apple-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {showDetails ? 'Weniger' : 'Einstellungen'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
