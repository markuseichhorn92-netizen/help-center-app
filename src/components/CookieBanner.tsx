"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {  AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const CONSENT_KEY = "cookie_consent";

// Kompakte Leiste unten (kein Vollbild-Overlay). z-index über dem Chat-Widget.
export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({ necessary: true, analytics: false, marketing: false, timestamp: 0 });

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) { setShowBanner(true); return; }
    try { setConsent(JSON.parse(saved) as CookieConsent); } catch { setShowBanner(true); }
  }, []);

  const saveConsent = (c: CookieConsent) => {
    const withTime = { ...c, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(withTime));
    setConsent(withTime);
    setShowBanner(false);
  };
  const acceptAll = () => saveConsent({ necessary: true, analytics: true, marketing: true, timestamp: 0 });
  const acceptNecessary = () => saveConsent({ necessary: true, analytics: false, marketing: false, timestamp: 0 });

  const btn = "min-h-11 rounded-xl px-4 text-sm font-bold transition active:scale-[.98]";
  const Toggle = ({ k, label }: { k: "analytics" | "marketing"; label: string }) => (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <input type="checkbox" className="h-5 w-5 accent-[#094b5a]" checked={consent[k]} onChange={(e) => setConsent({ ...consent, [k]: e.target.checked })} />
    </label>
  );

  return (
    <AnimatePresence>
      {showBanner && (
        <m.div
          role="region"
          aria-label="Cookie-Hinweis"
          className="fixed inset-x-0 bottom-0 z-[2147483647] p-3 sm:p-4"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-4 text-ink shadow-[0_10px_40px_rgba(6,50,60,.25)] dark:border-[#1d4650] dark:bg-[#0d2b33] dark:text-[#e8f1f3]">
            <p className="text-sm leading-relaxed">
              Wir nutzen notwendige Cookies und – mit deiner Zustimmung – Analyse- und Marketing-Cookies.{" "}
              <Link href="/datenschutz" className="font-semibold underline underline-offset-2">Datenschutz</Link>
            </p>
            {showDetails && (
              <div className="mt-2 divide-y divide-line border-t border-line dark:divide-[#1d4650] dark:border-[#1d4650]">
                <div className="flex min-h-11 items-center justify-between text-sm"><span>Notwendig</span><span className="text-xs text-mut dark:text-[#9fb4ba]">immer aktiv</span></div>
                <Toggle k="analytics" label="Analyse" />
                <Toggle k="marketing" label="Marketing" />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={showDetails ? () => saveConsent(consent) : acceptAll} className={`${btn} bg-p7 text-white hover:bg-p9 dark:bg-teal dark:text-[#06323c]`}>
                {showDetails ? "Auswahl speichern" : "Alle akzeptieren"}
              </button>
              <button onClick={acceptNecessary} className={`${btn} border border-line bg-white text-p7 hover:border-teal dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]`}>Nur notwendige</button>
              <button onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails} className={`${btn} text-p7 underline underline-offset-4 dark:text-[#8ccbd9]`}>
                {showDetails ? "Weniger" : "Einstellungen"}
              </button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (saved) { try { setConsent(JSON.parse(saved)); } catch { setConsent(null); } }
  }, []);
  return consent;
}
