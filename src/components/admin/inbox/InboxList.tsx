"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Btn, Dialog } from "../ui/Dialog";
import { Pill, cx } from "../ui/Pills";
import { useToast } from "../ui/Toast";
import { BanIcon, CheckIcon, MoreIcon, PlusIcon, RefreshIcon, SearchIcon, TrashIcon, CloseIcon } from "../ui/icons";
import InboxRow from "./InboxRow";
import SnoozeDialog from "./SnoozeDialog";
import { useInbox, type SortBy } from "./useInbox";
import { FILTER_LABELS, FILTER_ORDER, type InboxFilter, type InboxTicket, type TicketStatus } from "@/lib/admin/inbox";

const FILTER_KEYS = new Set<string>(FILTER_ORDER);
// alte Adressen (?filter=…) bleiben gültig
const LEGACY: Record<string, InboxFilter> = { all: "all", unread: "unread", escalated: "escalated", ai_handling: "ai_handling", open: "open", in_progress: "in_progress", resolved: "resolved", closed: "closed", other: "other" };

const STATUS_CHOICES: Array<{ value: TicketStatus; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "resolved", label: "Gelöst" },
  { value: "closed", label: "Geschlossen" },
];

export default function InboxList() {
  const params = useParams<{ id?: string }>();
  const currentId = params?.id;
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter") || "all";
  const [filter, setFilterState] = useState<InboxFilter>(FILTER_KEYS.has(urlFilter) ? (LEGACY[urlFilter] ?? "all") : "all");
  useEffect(() => {
    if (FILTER_KEYS.has(urlFilter)) setFilterState(urlFilter as InboxFilter);
  }, [urlFilter]);
  const setFilter = (f: InboxFilter) => {
    setFilterState(f);
    inbox.setSelected(new Set());
    const url = new URL(window.location.href);
    url.searchParams.set("filter", f);
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  const inbox = useInbox(filter);
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [snoozeFor, setSnoozeFor] = useState<InboxTicket | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ cur: number; total: number } | null>(null);

  const done = useCallback(async (t: InboxTicket) => {
    try {
      const undo = await inbox.markDone(t);
      toast.show({ text: `„${t.customerName}“ erledigt`, actionLabel: "Rückgängig", onAction: () => undo().catch(() => {}) });
    } catch {
      toast.show({ text: "Erledigen hat nicht geklappt", tone: "error" });
    }
  }, [inbox, toast]);

  const later = useCallback(async (t: InboxTicket, until: Date, label: string) => {
    try {
      const undo = await inbox.later(t, until);
      toast.show({ text: `Später: ${label}`, actionLabel: "Rückgängig", onAction: () => undo().catch(() => {}) });
    } catch {
      toast.show({ text: "Zurückstellen hat nicht geklappt", tone: "error" });
    }
  }, [inbox, toast]);

  const total = inbox.counts;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Kopf */}
      <header className="bg-adm-teal px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-adm-on-teal lg:border-b lg:border-adm-line lg:bg-adm-surface lg:text-adm-ink">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">Posteingang</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={inbox.fetchEmails}
              disabled={inbox.fetchingEmails}
              aria-label="E-Mails jetzt abrufen"
              title="E-Mails jetzt abrufen"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 lg:hover:bg-adm-surface-2"
            >
              <RefreshIcon className={inbox.fetchingEmails ? "animate-spin" : ""} />
            </button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Ansicht und weitere Aktionen" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 lg:hover:bg-adm-surface-2">
              <MoreIcon />
            </button>
          </div>
        </div>
        <div role="search" className="mt-2 flex items-center gap-2 rounded-2xl bg-white/15 px-3 lg:bg-adm-bg lg:ring-1 lg:ring-adm-line">
          <SearchIcon className="opacity-80" />
          <input
            type="search"
            value={inbox.search}
            onChange={(e) => inbox.setSearch(e.target.value)}
            placeholder="Suchen in Anfragen …"
            aria-label="Anfragen durchsuchen (Nummer, Betreff, Name, E-Mail)"
            className="h-12 w-full bg-transparent text-base text-inherit outline-none placeholder:text-current placeholder:opacity-70"
          />
          {inbox.search && (
            <button type="button" onClick={() => inbox.setSearch("")} aria-label="Suche leeren" className="flex h-11 w-11 items-center justify-center">
              <CloseIcon />
            </button>
          )}
        </div>
        {inbox.emailResult && (
          <p role="status" className="mt-2 text-sm font-semibold">
            {inbox.emailResult}
          </p>
        )}
      </header>

      {/* Filter */}
      <div role="group" aria-label="Filter" className="adm-scroll-x flex shrink-0 gap-2 overflow-x-auto border-b border-adm-line bg-adm-bg px-4 py-3">
        {FILTER_ORDER.map((f) => {
          const n = total[f];
          const on = f === filter;
          if (!on && n === 0 && (f === "escalated" || f === "ai_handling" || f === "snoozed" || f === "other")) return null;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f)}
              className={cx(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold",
                on ? "border-adm-teal bg-adm-teal text-adm-on-teal" : "border-adm-line bg-adm-surface text-adm-ink hover:bg-adm-surface-2"
              )}
            >
              {FILTER_LABELS[f]}
              {(f === "all" || f === "unread" || n > 0) && <span className="adm-mono text-xs opacity-80">· {n}</span>}
            </button>
          );
        })}
      </div>

      {inbox.newItems && (
        <button
          type="button"
          onClick={() => { inbox.clearNewItems(); document.getElementById("inbox-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="mx-4 mt-2 min-h-11 rounded-full bg-adm-apricot px-4 text-sm font-bold text-adm-on-apricot"
        >
          Neue Nachrichten – nach oben
        </button>
      )}

      {/* Sammelaktionen */}
      {inbox.selectMode && (
        <div className="flex flex-wrap items-center gap-2 border-b border-adm-line bg-adm-surface px-4 py-2">
          <Btn variant="ghost" onClick={inbox.toggleSelectAllVisible}>Alle sichtbaren</Btn>
          <span className="text-sm font-semibold text-adm-mut" aria-live="polite">{inbox.selected.size} gewählt</span>
          <div className="ml-auto flex gap-2">
            <Btn variant="soft" disabled={inbox.selected.size === 0} onClick={() => setStatusOpen(true)}>Status</Btn>
            <Btn variant="danger" disabled={inbox.selected.size === 0} onClick={() => setDeleteOpen(true)}><TrashIcon width={18} height={18} />Löschen</Btn>
            <Btn variant="primary" onClick={() => { inbox.setSelectMode(false); inbox.setSelected(new Set()); }}>Fertig</Btn>
          </div>
        </div>
      )}

      {/* Liste */}
      <div id="inbox-scroll" className="min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-0">
        {inbox.loading ? (
          <ul aria-busy="true" aria-label="Anfragen werden geladen">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex gap-3 border-b border-adm-line px-4 py-4">
                <span className="h-10 w-10 animate-pulse rounded-full bg-adm-surface-2" />
                <span className="flex-1 space-y-2">
                  <span className="block h-4 w-1/2 animate-pulse rounded bg-adm-surface-2" />
                  <span className="block h-4 w-4/5 animate-pulse rounded bg-adm-surface-2" />
                  <span className="block h-3 w-2/3 animate-pulse rounded bg-adm-surface-2" />
                </span>
              </li>
            ))}
          </ul>
        ) : inbox.error ? (
          <div role="alert" className="m-4 rounded-2xl bg-adm-danger-bg p-4 text-adm-danger-ink">
            <p className="font-bold">Fehler: {inbox.error}</p>
            <Btn variant="soft" className="mt-3" onClick={inbox.reload}>Erneut versuchen</Btn>
          </div>
        ) : inbox.visible.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-adm-ok-bg text-adm-ok-ink"><CheckIcon width={28} height={28} /></span>
            <p className="text-lg font-bold">{inbox.search ? "Keine Treffer" : "Nichts zu tun"}</p>
            <p className="mt-1 text-sm text-adm-mut">{inbox.search ? "Andere Suchbegriffe probieren." : `Keine Anfragen unter „${FILTER_LABELS[filter]}“.`}</p>
          </div>
        ) : (
          <>
            <ul aria-label={`Anfragen: ${FILTER_LABELS[filter]}`}>
              {inbox.visible.map((t) => (
                <InboxRow
                  key={t.id}
                  ticket={t}
                  preview={inbox.previews[t.id]}
                  current={t.id === currentId}
                  selectMode={inbox.selectMode}
                  checked={inbox.selected.has(t.id)}
                  onToggle={() => inbox.toggleSelect(t.id)}
                  onDone={() => done(t)}
                  onLater={() => setSnoozeFor(t)}
                />
              ))}
            </ul>
            {inbox.hasMore && (
              <div className="p-4 text-center">
                <Btn variant="soft" onClick={inbox.loadMore}>Mehr anzeigen ({inbox.filtered.length - inbox.visible.length} weitere)</Btn>
              </div>
            )}
          </>
        )}
      </div>

      {/* Neue Anfrage (Daumenzone) */}
      {!inbox.selectMode && (
        <Link
          href="/admin/tickets/new"
          aria-label="Neues Ticket anlegen"
          className="fixed bottom-[88px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-adm-apricot text-adm-on-apricot shadow-xl lg:absolute lg:bottom-4 lg:right-4"
        >
          <PlusIcon width={28} height={28} />
        </Link>
      )}

      <SnoozeDialog
        open={!!snoozeFor}
        onClose={() => setSnoozeFor(null)}
        onPick={(until, label) => {
          const t = snoozeFor;
          setSnoozeFor(null);
          if (t) later(t, until, label);
        }}
      />

      {/* Ansicht & weitere Aktionen (alles, was die alte Liste konnte) */}
      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Ansicht und Aktionen">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-adm-mut">Sortierung</legend>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Sortieren nach"
                value={inbox.sortBy}
                onChange={(e) => inbox.setSortBy(e.target.value as SortBy)}
                className="min-h-11 rounded-xl border border-adm-line bg-adm-surface px-3 text-sm font-semibold"
              >
                <option value="updatedAt">Zuletzt aktiv</option>
                <option value="createdAt">Erstellt</option>
                <option value="status">Status</option>
              </select>
              <Btn variant="soft" onClick={() => inbox.setSortDesc(!inbox.sortDesc)}>{inbox.sortDesc ? "Neueste zuerst" : "Älteste zuerst"}</Btn>
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" checked={inbox.autoRefresh} onChange={(e) => inbox.setAutoRefresh(e.target.checked)} className="h-6 w-6 accent-[var(--adm-teal)]" />
            Automatisch aktualisieren (alle 15 Sek.)
          </label>
          <div className="flex flex-col gap-2">
            <Btn variant="soft" onClick={() => { setMenuOpen(false); inbox.setSelectMode(true); }}>Mehrere auswählen</Btn>
            <Btn variant="soft" onClick={() => { inbox.reload(); setMenuOpen(false); }}>Liste neu laden</Btn>
            <Link href="/admin/tickets/spam-folder" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-adm-danger-bg px-4 text-sm font-bold text-adm-danger-ink"><BanIcon width={18} height={18} />Spam-Ordner</Link>
            <Link href="/admin/tickets/trash" onClick={() => setMenuOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-adm-surface-2 px-4 text-sm font-bold"><TrashIcon width={18} height={18} />Papierkorb</Link>
            <Btn variant="ghost" onClick={() => { setMenuOpen(false); inbox.resetEmailCache(); }}>E-Mail-Cache leeren (Technik)</Btn>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={`Status für ${inbox.selected.size} Anfragen`}
      >
        <div className="grid gap-2">
          {STATUS_CHOICES.map((s) => (
            <Btn
              key={s.value}
              variant="soft"
              onClick={async () => {
                setStatusOpen(false);
                try {
                  await inbox.batchStatus(s.value);
                  toast.show({ text: `Status gesetzt: ${s.label}` });
                } catch (e) {
                  toast.show({ text: "Fehler: " + (e as Error).message, tone: "error" });
                }
              }}
            >
              {s.label}
            </Btn>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Anfragen löschen?"
        footer={
          <>
            <Btn variant="ghost" disabled={!!deleting} onClick={() => setDeleteOpen(false)}>Abbrechen</Btn>
            <Btn
              variant="danger"
              disabled={!!deleting}
              onClick={async () => {
                setDeleting({ cur: 0, total: inbox.selected.size });
                try {
                  await inbox.deleteSelected((cur, total) => setDeleting({ cur, total }));
                } finally {
                  setDeleting(null);
                  setDeleteOpen(false);
                }
              }}
            >
              {deleting ? `Lösche ${deleting.cur}/${deleting.total} …` : "In den Papierkorb"}
            </Btn>
          </>
        }
      >
        <p>{inbox.selected.size} Anfrage(n) werden in den Papierkorb verschoben (wiederherstellbar).</p>
        <Pill tone="mut" className="mt-3">Kein endgültiges Löschen</Pill>
      </Dialog>
    </div>
  );
}
