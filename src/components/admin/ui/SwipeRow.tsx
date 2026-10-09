"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckIcon, ClockIcon } from "./icons";

const THRESHOLD = 88;

/**
 * Wisch-Zeile (Touch): nach rechts = Erledigt, nach links = Später.
 * Per Tastatur/Maus gibt es dieselben Aktionen über die Zeilen-Schaltflächen (siehe InboxRow).
 */
export default function SwipeRow({
  children,
  onDone,
  onLater,
  disabled,
}: {
  children: ReactNode;
  onDone: () => void;
  onLater: () => void;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, locked: null };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my) * 1.4;
    if (s.locked) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setDx(Math.max(-160, Math.min(160, mx)));
    }
  };
  const end = () => {
    const s = start.current;
    start.current = null;
    if (!s?.locked) return setDx(0);
    setAnimating(true);
    const v = dx;
    setDx(0);
    window.setTimeout(() => setAnimating(false), 180);
    if (v >= THRESHOLD) onDone();
    else if (v <= -THRESHOLD) onLater();
  };

  const showDone = dx > 0;
  const showLater = dx < 0;
  const reached = Math.abs(dx) >= THRESHOLD;

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-between">
        <div className={`flex h-full items-center gap-2 px-5 font-bold text-white ${showDone ? "opacity-100" : "opacity-0"}`} style={{ background: "#1f7a43", width: "50%" }}>
          <CheckIcon /> Erledigt
        </div>
        <div className={`flex h-full items-center justify-end gap-2 px-5 font-bold text-white ${showLater ? "opacity-100" : "opacity-0"}`} style={{ background: "#5b4aa8", width: "50%" }}>
          Später <ClockIcon />
        </div>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y", transition: animating ? "transform .18s ease-out" : undefined }}
        className={`relative bg-adm-surface ${reached ? "shadow-lg" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
