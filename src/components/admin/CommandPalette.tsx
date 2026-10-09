"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/Dialog";
import { cx } from "./ui/Pills";
import { SearchIcon } from "./ui/icons";
import { fireTicketAction, useInboxTickets } from "./inboxStore";
import { MORE_NAV, PRIMARY_NAV } from "./nav";
import { useAdminControls, useTheme } from "./useAdminControls";
import { FILTER_LABELS, FILTER_ORDER, matchesSearch } from "@/lib/admin/inbox";

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** ⌘K / Strg+K – Navigation, Ticketsuche und Aktionen per Tastatur */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const tickets = useInboxTickets();
  const controls = useAdminControls();
  const theme = useTheme();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const go = (href: string) => () => router.push(href);

  const commands = useMemo<Cmd[]>(() => {
    const onTicket = typeof window !== "undefined" && /^\/admin\/tickets\/[^/]+$/.test(window.location.pathname) && !/\/(new|trash|spam-folder)$/.test(window.location.pathname);
    const list: Cmd[] = [];
    if (onTicket) {
      list.push(
        { id: "a-lena", group: "Dieses Ticket", label: "Lena-Vorschlag erstellen", run: () => fireTicketAction("lena") },
        { id: "a-reply", group: "Dieses Ticket", label: "Zur Antwort springen", run: () => fireTicketAction("reply") },
        { id: "a-done", group: "Dieses Ticket", label: "Erledigt", hint: "Status „Gelöst“", run: () => fireTicketAction("done") },
        { id: "a-later", group: "Dieses Ticket", label: "Später …", run: () => fireTicketAction("later") }
      );
    }
    list.push({ id: "new", group: "Aktionen", label: "Neues Ticket anlegen", run: go("/admin/tickets/new") });
    list.push({ id: "fetch", group: "Aktionen", label: "E-Mails jetzt abrufen", run: () => { fetch("/api/admin/fetch-emails", { method: "POST" }).then(() => window.dispatchEvent(new Event("adm:refresh-inbox"))).catch(() => {}); } });
    for (const f of FILTER_ORDER) list.push({ id: `f-${f}`, group: "Posteingang filtern", label: FILTER_LABELS[f], run: go(`/admin/tickets?filter=${f}`) });
    for (const n of PRIMARY_NAV) list.push({ id: `n-${n.key}`, group: "Gehe zu", label: n.label, run: go(n.href) });
    for (const n of MORE_NAV) list.push({ id: `m-${n.href}`, group: "Gehe zu", label: n.label, run: go(n.href) });
    list.push({ id: "theme", group: "Einstellungen", label: theme.dark ? "Heller Modus" : "Dunkler Modus", run: theme.toggle });
    list.push({ id: "status", group: "Einstellungen", label: controls.adminStatus === "online" ? "Live-Chat auf Offline stellen" : "Live-Chat auf Online stellen", run: controls.toggleStatus });
    list.push({ id: "logout", group: "Einstellungen", label: "Abmelden", run: controls.logout });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return list;
  }, [theme.dark, controls.adminStatus]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return commands.slice(0, 12);
    const cmdHits = commands.filter((c) => c.label.toLowerCase().includes(query)).slice(0, 8);
    const ticketHits: Cmd[] = tickets
      .filter((t) => t.category !== "sonstiges" && matchesSearch(t, query))
      .slice(0, 8)
      .map((t) => ({
        id: `t-${t.id}`,
        group: "Tickets",
        label: `${t.customerName} – ${t.subject}`,
        hint: t.ticketNumber,
        run: go(`/admin/tickets/${t.id}`),
      }));
    return [...ticketHits, ...cmdHits];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, commands, tickets]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (c: Cmd | undefined) => {
    if (!c) return;
    onClose();
    // nach dem Schließen ausführen, damit der Fokus-Rückgabe-Effekt nicht stört
    setTimeout(c.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    }
  };

  let lastGroup = "";
  return (
    <Dialog open={open} onClose={onClose} title="Befehle und Suche">
      <div onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2 rounded-2xl border border-adm-line bg-adm-bg px-3">
          <SearchIcon className="text-adm-mut" />
          <input
            data-autofocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label="Befehl oder Ticket suchen"
            placeholder="Ticket suchen oder Befehl eingeben …"
            className="h-12 w-full bg-transparent text-base text-adm-ink outline-none placeholder:text-adm-mut"
          />
        </div>
        <ul ref={listRef} id={listId} role="listbox" aria-label="Ergebnisse" className="mt-3 max-h-[50dvh] overflow-y-auto">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-adm-mut">Nichts gefunden.</li>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {header && <div className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-adm-mut">{header}</div>}
                <div
                  id={`${listId}-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={cx("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[15px]", i === active ? "bg-adm-teal text-adm-on-teal" : "text-adm-ink")}
                >
                  <span className="truncate">{c.label}</span>
                  {c.hint && <span className="adm-mono shrink-0 text-xs opacity-80">{c.hint}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 hidden text-xs text-adm-mut sm:block">↑ ↓ wählen · Enter ausführen · Esc schließen</p>
      </div>
    </Dialog>
  );
}
