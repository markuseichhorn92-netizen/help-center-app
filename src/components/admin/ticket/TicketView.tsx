"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { useInboxTickets } from "../inboxStore";
import { setStatus } from "../ticketApi";
import SnoozeDialog from "../inbox/SnoozeDialog";
import { ArrowDownIcon, ArrowUpIcon, BanIcon, BookIcon, ForwardIcon, NoteIcon, TagIcon, TrashIcon, CheckIcon } from "../ui/icons";
import Composer from "./Composer";
import { ArticlesDialog, CategoryDialog, ConfirmSendDialog, CustomAiDialog, DeleteDialog, ForwardDialog, ShareDialog, SpamDialog } from "./Dialogs";
import MessageList from "./MessageList";
import { ControlsPanel, CustomerCard } from "./SidePanels";
import TicketHeader from "./TicketHeader";
import { useTicketDetail, type LeaveReason } from "./useTicketDetail";
import { isSnoozed, sortInbox } from "@/lib/admin/inbox";

export default function TicketView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const inboxTickets = useInboxTickets();
  const prevStatus = useRef<string | undefined>(undefined);

  // Nachbar-Tickets aus dem bereits geladenen Posteingang (kein Extra-Abruf)
  const order = useMemo(
    () => sortInbox(inboxTickets.filter((t) => t.category !== "sonstiges" && t.status !== "closed" && t.status !== "resolved" && !isSnoozed(t)), "all"),
    [inboxTickets]
  );
  const idx = order.findIndex((t) => t.id === id);
  const prevId = idx > 0 ? order[idx - 1].id : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1].id : idx < 0 && order[0] ? order[0].id : null;

  const t = useTicketDetail(id, {
    onLeave: (reason: LeaveReason) => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const undoStatus = prevStatus.current as "open" | "in_progress" | undefined;
      if (reason === "resolved" || reason === "closed") {
        toast.show({
          text: reason === "closed" ? "Geschlossen" : "Erledigt",
          actionLabel: undoStatus ? "Rückgängig" : undefined,
          onAction: () => undoStatus && setStatus(id, undoStatus).then(() => router.push(`/admin/tickets/${id}`)).catch(() => {}),
        });
      } else if (reason === "later") {
        toast.show({ text: "Später erinnern gesetzt" });
      } else if (reason === "deleted") {
        toast.show({ text: "In den Papierkorb verschoben" });
      }
      // Desktop: nächste Anfrage öffnen, Handy: zurück zur Liste
      if (desktop && nextId && nextId !== id) router.push(`/admin/tickets/${nextId}`);
      else router.push("/admin/tickets");
    },
  });

  useEffect(() => {
    if (t.ticket && t.ticket.status !== "resolved" && t.ticket.status !== "closed") prevStatus.current = t.ticket.status;
  }, [t.ticket]);

  const [moreOpen, setMoreOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [articlesOpen, setArticlesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [spamOpen, setSpamOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Aktionen aus der ⌘K-Palette
  useEffect(() => {
    const h = (e: Event) => {
      const a = (e as CustomEvent).detail?.action;
      if (a === "done") t.handleStatusChange("resolved");
      else if (a === "later") setSnoozeOpen(true);
      else if (a === "lena") t.requestLena(true);
      else if (a === "reply") document.querySelector<HTMLElement>("#reply-area .ProseMirror")?.focus();
    };
    window.addEventListener("adm:ticket-action", h);
    return () => window.removeEventListener("adm:ticket-action", h);
  });

  // Wartezeit: Beginn der letzten unbeantworteten Kundenserie
  const waitingSince = useMemo(() => {
    const m = t.messages;
    if (m.length === 0 || m[m.length - 1].sender !== "customer") return null;
    let i = m.length - 1;
    while (i > 0 && m[i - 1].sender === "customer") i--;
    return m[i].createdAt;
  }, [t.messages]);

  if (t.loading) {
    return (
      <div className="flex h-full items-center justify-center bg-adm-bg" role="status">
        <p className="animate-pulse text-adm-mut">Anfrage wird geladen …</p>
      </div>
    );
  }
  if (t.error || !t.ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-adm-bg p-6 text-center">
        <p role="alert" className="rounded-2xl bg-adm-danger-bg px-5 py-4 font-bold text-adm-danger-ink">Fehler: {t.error || "Ticket nicht gefunden"}</p>
        <Link href="/admin/tickets" className="inline-flex min-h-11 items-center rounded-full bg-adm-teal px-5 font-bold text-adm-on-teal">Zurück zum Posteingang</Link>
      </div>
    );
  }
  const ticket = t.ticket;
  const active = ticket.status !== "closed" && ticket.status !== "resolved";

  const menuBtn = "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] font-bold hover:bg-adm-surface-2";

  return (
    <div className="flex h-full min-h-0 bg-adm-bg">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TicketHeader
          ticket={ticket}
          waitingSince={waitingSince}
          onDone={() => t.handleStatusChange("resolved")}
          onLater={() => setSnoozeOpen(true)}
          onMore={() => setMoreOpen(true)}
          onDetails={() => setDetailsOpen(true)}
          prevId={prevId}
          nextId={nextId && nextId !== id ? nextId : null}
          goTo={(to) => router.push(`/admin/tickets/${to}`)}
        />
        <MessageList messages={t.messages} typing={t.isCustomerTyping} onForward={(m) => { t.setForwardMessage(m); t.setShowForwardModal(true); }} channelFallback={ticket.channel} />
        <Composer t={t} onSendDone={() => setConfirmSend(true)} onLater={() => setSnoozeOpen(true)} onOpenCustom={() => setCustomOpen(true)} onOpenArticles={() => setArticlesOpen(true)} />
      </div>

      {/* Desktop: dritte Spalte */}
      <aside aria-label="Kunde und Details" className="hidden w-[320px] shrink-0 space-y-3 overflow-y-auto border-l border-adm-line bg-adm-bg p-4 xl:block 2xl:w-[360px]">
        <CustomerCard t={t} />
        <ControlsPanel t={t} onShare={() => setShareOpen(true)} onSearchArticles={() => setArticlesOpen(true)} />
      </aside>

      <audio ref={t.audioRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>

      {/* Handy/Tablet: Details als Sheet */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Kunde und Details" wide>
        <div className="space-y-3 bg-adm-bg">
          <CustomerCard t={t} />
          <ControlsPanel t={t} onShare={() => { setDetailsOpen(false); setShareOpen(true); }} onSearchArticles={() => { setDetailsOpen(false); setArticlesOpen(true); }} />
        </div>
      </Dialog>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Weitere Aktionen">
        <ul>
          <li className="flex gap-2 sm:hidden">
            <button type="button" disabled={!prevId} className={`${menuBtn} justify-center disabled:opacity-40`} onClick={() => { setMoreOpen(false); prevId && router.push(`/admin/tickets/${prevId}`); }}><ArrowUpIcon />Vorherige</button>
            <button type="button" disabled={!nextId || nextId === id} className={`${menuBtn} justify-center disabled:opacity-40`} onClick={() => { setMoreOpen(false); nextId && router.push(`/admin/tickets/${nextId}`); }}><ArrowDownIcon />Nächste</button>
          </li>
          {ticket.channel === "email" && (
            <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); setCategoryOpen(true); }}><TagIcon className="text-adm-teal dark:text-adm-apricot" />{ticket.category === "sonstiges" ? "Ist Kundenanfrage" : "Ist Sonstiges"}<span className="text-xs font-normal text-adm-mut">{ticket.categoryReason}</span></button></li>
          )}
          <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); setArticlesOpen(true); }}><BookIcon className="text-adm-teal dark:text-adm-apricot" />Artikel suchen</button></li>
          <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); setDetailsOpen(true); }}><NoteIcon className="text-adm-teal dark:text-adm-apricot" />Notizen, Tags und Status</button></li>
          {active && <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); t.handleStatusChange("closed"); }}><CheckIcon className="text-adm-teal dark:text-adm-apricot" />Schließen (mit Bewertungsanfrage)</button></li>}
          <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); t.setForwardMessage(t.messages[t.messages.length - 1] || null); t.setShowForwardModal(true); }}><ForwardIcon className="text-adm-teal dark:text-adm-apricot" />Letzte Nachricht weiterleiten</button></li>
          <li><button type="button" className={menuBtn} onClick={() => { setMoreOpen(false); setSpamOpen(true); }}><BanIcon className="text-adm-danger-ink" />Als Spam markieren</button></li>
          <li><button type="button" className={`${menuBtn} text-adm-danger-ink`} onClick={() => { setMoreOpen(false); setDeleteOpen(true); }}><TrashIcon />Ticket löschen</button></li>
        </ul>
      </Dialog>

      <SnoozeDialog open={snoozeOpen} onClose={() => setSnoozeOpen(false)} onPick={(until) => { setSnoozeOpen(false); t.handleSnooze(until); }} />
      <ConfirmSendDialog t={t} open={confirmSend} onClose={() => setConfirmSend(false)} onConfirm={async () => { await t.handleSendReply(undefined, true); setConfirmSend(false); }} />
      <ForwardDialog t={t} />
      <ShareDialog t={t} open={shareOpen} onClose={() => setShareOpen(false)} />
      <CustomAiDialog t={t} open={customOpen} onClose={() => setCustomOpen(false)} />
      <ArticlesDialog t={t} open={articlesOpen} onClose={() => setArticlesOpen(false)} onShare={() => setShareOpen(true)} />
      <SpamDialog t={t} open={spamOpen} onClose={() => setSpamOpen(false)} onDone={() => {}} />
      <CategoryDialog t={t} open={categoryOpen} onClose={() => setCategoryOpen(false)} />
      <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={t.handleDelete} />
    </div>
  );
}
