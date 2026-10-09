"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { cx } from "./Pills";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Zugänglicher Dialog: Mobil als Bottom-Sheet, ab sm zentriert.
 * Escape schließt, Fokus bleibt im Dialog, danach zurück zum Auslöser, Hintergrund-Scroll gesperrt.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Hintergrund für Screenreader/Tastatur sperren (modal)
    const inerted = Array.from(document.body.children).filter((el) => el !== overlayRef.current && !el.hasAttribute("inert"));
    inerted.forEach((el) => el.setAttribute("inert", ""));
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") || node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      inerted.forEach((el) => el.removeAttribute("inert"));
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={overlayRef} className="adm-root fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4 adm-fade-in" style={{ background: "rgba(5,15,18,.55)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        className={cx(
          "adm-sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-adm-line bg-adm-surface text-adm-ink shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-adm-line px-5 py-3">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-11 w-11 items-center justify-center rounded-full text-adm-mut hover:bg-adm-surface-2"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="adm-safe-bottom flex flex-wrap items-center justify-end gap-2 border-t border-adm-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Standard-Buttons (Mindesthöhe 44 px) */
export function Btn({
  variant = "soft",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "apricot" | "soft" | "ghost" | "danger" | "ok" }) {
  const styles = {
    primary: "bg-adm-teal text-adm-on-teal hover:bg-adm-teal-2",
    apricot: "bg-adm-apricot text-adm-on-apricot hover:brightness-105",
    soft: "bg-adm-surface-2 text-adm-ink hover:brightness-95",
    ghost: "text-adm-mut hover:bg-adm-surface-2",
    danger: "bg-adm-danger-bg text-adm-danger-ink hover:brightness-95",
    ok: "bg-adm-ok-bg text-adm-ok-ink hover:brightness-95",
  }[variant];
  return (
    <button
      type="button"
      {...p}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
    />
  );
}
