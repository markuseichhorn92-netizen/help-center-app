"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "ok" | "error";
}
interface Ctx {
  show: (t: Omit<ToastItem, "id">, ms?: number) => void;
}

const ToastCtx = createContext<Ctx>({ show: () => {} });
export const useToast = () => useContext(ToastCtx);

/** Kurze Hinweise unten (mit „Rückgängig“). role=status → Screenreader lesen sie vor. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((t: Omit<ToastItem, "id">, ms = 6000) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), ms);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[120] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="adm-sheet-in pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl"
            style={{ background: t.tone === "error" ? "#7a1f1f" : "#0a2a33", color: "#fff" }}
          >
            <span>{t.text}</span>
            {t.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.();
                  setItems((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="min-h-11 rounded-full px-3 font-bold"
                style={{ color: "#f4b385" }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
