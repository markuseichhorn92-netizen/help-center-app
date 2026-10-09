"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countFilters, matchesFilter, matchesSearch, sortInbox,
  type InboxFilter, type InboxTicket, type TicketPreview, type TicketStatus,
} from "@/lib/admin/inbox";
import { publishTickets } from "../inboxStore";
import { DONE_STATUS, putTicket, setStatus, snoozeTicket } from "../ticketApi";

async function fetchTickets(): Promise<InboxTicket[]> {
  const res = await fetch("/api/admin/tickets", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/admin/login";
      throw new Error("Session abgelaufen");
    }
    throw new Error("Tickets konnten nicht geladen werden");
  }
  return res.json();
}

async function fetchEmailsInBackground() {
  try {
    await fetch("/api/admin/fetch-emails", { method: "POST", credentials: "same-origin" });
  } catch (err) {
    console.error("Background email fetch failed:", err);
  }
}

export type SortBy = "updatedAt" | "createdAt" | "status";
export const PAGE_SIZE = 30;

/** Daten, Polling, Filter, Auswahl und Aktionen des Posteingangs (Logik aus der alten Ticketliste, UI-frei). */
export function useInbox(filter: InboxFilter) {
  const [tickets, setTickets] = useState<InboxTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [newItems, setNewItems] = useState(false);
  const [previews, setPreviews] = useState<Record<string, TicketPreview & { forUpdatedAt: string }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const ticketsRef = useRef<InboxTicket[]>([]);
  const loadingPreviews = useRef<Set<string>>(new Set());

  const apply = useCallback((list: InboxTicket[], detectNew = false) => {
    if (detectNew) {
      const known = new Map(ticketsRef.current.map((t) => [t.id, t]));
      const fresh = list.filter((t) => t.category !== "sonstiges");
      if (
        ticketsRef.current.length > 0 &&
        fresh.some((t) => {
          const k = known.get(t.id);
          return !k || t.updatedAt !== k.updatedAt || (t.unreadCount || 0) > (k.unreadCount || 0);
        })
      ) {
        setNewItems(true);
      }
    }
    ticketsRef.current = list;
    setTickets(list);
    publishTickets(list);
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await fetchTickets());
      setNewItems(false);
      setError(null);
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError" || e.message?.includes("Load failed")) return;
      setError(e.message);
    }
  }, [apply]);

  // Erstladen: erst Liste, dann E-Mails im Hintergrund abrufen
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchTickets();
        if (!mounted) return;
        apply(list);
        setLoading(false);
        fetchEmailsInBackground().then(async () => {
          if (mounted) apply(await fetchTickets());
        });
      } catch (err) {
        const e = err as Error;
        if (!mounted || e.name === "AbortError" || e.message?.includes("Load failed")) return;
        setError(e.message);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [apply]);

  // Aktualisieren: Liste alle 15 s, E-Mails alle 60 s – nur bei sichtbarem Tab
  useEffect(() => {
    if (!autoRefresh) return;
    const t1 = setInterval(async () => {
      if (document.hidden) return;
      try {
        apply(await fetchTickets(), true);
      } catch (err) {
        console.error("Auto-refresh failed:", err);
      }
    }, 15000);
    const t2 = setInterval(async () => {
      if (document.hidden) return;
      await fetchEmailsInBackground();
      try {
        apply(await fetchTickets(), true);
      } catch {
        /* ignore */
      }
    }, 60000);
    const onRefresh = () => reload();
    window.addEventListener("adm:refresh-inbox", onRefresh);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      window.removeEventListener("adm:refresh-inbox", onRefresh);
    };
  }, [autoRefresh, apply, reload]);

  const counts = useMemo(() => countFilters(tickets), [tickets]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const list = tickets.filter((t) => matchesFilter(t, filter, now) && matchesSearch(t, search));
    if (filter === "unread" || (sortBy === "updatedAt" && sortDesc)) return sortInbox(list, filter);
    const mult = sortDesc ? -1 : 1;
    const order: Record<TicketStatus, number> = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
    return [...list].sort((a, b) => {
      if (sortBy === "status") {
        const d = order[a.status] - order[b.status];
        if (d !== 0) return d * mult;
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mult;
      }
      const key = sortBy === "createdAt" ? "createdAt" : "updatedAt";
      return (new Date(a[key]).getTime() - new Date(b[key]).getTime()) * mult;
    });
  }, [tickets, filter, search, sortBy, sortDesc]);

  useEffect(() => setLimit(PAGE_SIZE), [filter, search]);
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  // Vorschau/„wartet seit“ nur für sichtbare Zeilen nachladen
  const visibleKey = visible.map((t) => `${t.id}:${t.updatedAt}`).join("|");
  useEffect(() => {
    const need = visible.filter((t) => {
      const p = previews[t.id];
      return (!p || p.forUpdatedAt !== t.updatedAt) && !loadingPreviews.current.has(`${t.id}:${t.updatedAt}`);
    });
    if (need.length === 0) return;
    need.forEach((t) => loadingPreviews.current.add(`${t.id}:${t.updatedAt}`));
    let cancelled = false;
    (async () => {
      for (let i = 0; i < need.length; i += 20) {
        const chunk = need.slice(i, i + 20);
        try {
          const res = await fetch(`/api/admin/tickets/previews?ids=${chunk.map((t) => t.id).join(",")}`, { credentials: "same-origin" });
          if (!res.ok) continue;
          const data: Record<string, TicketPreview> = await res.json();
          if (cancelled) return;
          setPreviews((prev) => {
            const next = { ...prev };
            for (const t of chunk) if (data[t.id]) next[t.id] = { ...data[t.id], forUpdatedAt: t.updatedAt };
            return next;
          });
        } catch {
          /* Vorschau ist optional */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  // --- Aktionen (optimistisch) ---
  const patchLocal = useCallback((id: string, patch: Partial<InboxTicket>) => {
    apply(ticketsRef.current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, [apply]);

  const markDone = useCallback(async (t: InboxTicket) => {
    const prev = t.status;
    patchLocal(t.id, { status: DONE_STATUS });
    try {
      await setStatus(t.id, DONE_STATUS);
    } catch (e) {
      patchLocal(t.id, { status: prev });
      throw e;
    }
    return () => {
      patchLocal(t.id, { status: prev });
      return setStatus(t.id, prev);
    };
  }, [patchLocal]);

  const later = useCallback(async (t: InboxTicket, until: Date) => {
    const prev = { snoozedUntil: t.snoozedUntil, snoozedAt: t.snoozedAt };
    patchLocal(t.id, { snoozedUntil: until.toISOString(), snoozedAt: t.updatedAt });
    try {
      await snoozeTicket(t.id, until);
    } catch (e) {
      patchLocal(t.id, prev);
      throw e;
    }
    return () => {
      patchLocal(t.id, { snoozedUntil: undefined, snoozedAt: undefined });
      return snoozeTicket(t.id, null);
    };
  }, [patchLocal]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAllVisible = () => {
    const ids = visible.map((t) => t.id);
    const all = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const batchStatus = useCallback(async (status: TicketStatus) => {
    if (selected.size === 0) return;
    const res = await fetch("/api/admin/tickets/batch", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Unbekannter Fehler");
    }
    setSelected(new Set());
    await reload();
  }, [selected, reload]);

  const deleteSelected = useCallback(async (onProgress: (cur: number, total: number) => void) => {
    const ids = Array.from(selected);
    for (let i = 0; i < ids.length; i++) {
      await fetch(`/api/admin/tickets/${ids[i]}`, { method: "DELETE", credentials: "same-origin" });
      onProgress(i + 1, ids.length);
    }
    setSelected(new Set());
    await reload();
  }, [selected, reload]);

  const fetchEmails = useCallback(async () => {
    setFetchingEmails(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/fetch-emails", { method: "POST", credentials: "same-origin" });
      const data = await res.json();
      if (data.success && data.errors?.length === 0) {
        setEmailResult(`${data.processed} neue E-Mail(s) verarbeitet`);
        if (data.processed > 0) await reload();
      } else {
        setEmailResult("Fehler: " + (data.errors?.join(", ") || data.error || "Unbekannt"));
      }
    } catch (err) {
      setEmailResult("Fehler: " + (err as Error).message);
    } finally {
      setFetchingEmails(false);
      setTimeout(() => setEmailResult(null), 5000);
    }
  }, [reload]);

  const resetEmailCache = useCallback(async () => {
    if (!confirm("Email-Cache wirklich leeren? Alle bereits verarbeiteten E-Mails werden beim nächsten Abruf erneut geprüft.")) return;
    try {
      const res = await fetch("/api/admin/reset-email-cache", { method: "POST", credentials: "same-origin" });
      const data = await res.json();
      if (data.success) {
        setEmailResult(`Cache geleert: ${data.deletedCount} Einträge gelöscht`);
        setTimeout(() => fetchEmails(), 1000);
      } else {
        setEmailResult("Fehler: " + (data.error || "Unbekannt"));
      }
    } catch (err) {
      setEmailResult("Fehler: " + (err as Error).message);
    }
  }, [fetchEmails]);

  return {
    tickets, loading, error, counts, filtered, visible, previews,
    search, setSearch, autoRefresh, setAutoRefresh, sortBy, setSortBy, sortDesc, setSortDesc,
    hasMore: filtered.length > limit, loadMore: () => setLimit((l) => l + PAGE_SIZE),
    newItems, clearNewItems: () => setNewItems(false), reload,
    selected, selectMode, setSelectMode, setSelected, toggleSelect, toggleSelectAllVisible,
    markDone, later, batchStatus, deleteSelected,
    fetchEmails, fetchingEmails, emailResult, resetEmailCache,
  };
}

export { putTicket };
