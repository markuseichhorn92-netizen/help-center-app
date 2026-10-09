"use client";

import { useState } from "react";
import { Btn, Dialog } from "../ui/Dialog";
import { Pill, cx } from "../ui/Pills";
import { GlobeIcon, MailIcon, SearchIcon, SparkleIcon, WhatsAppIcon, BookIcon, ShareIcon } from "../ui/icons";
import type { useTicketDetail } from "./useTicketDetail";

type T = ReturnType<typeof useTicketDetail>;
const field = "min-h-11 w-full rounded-xl border border-adm-line bg-adm-surface px-3 text-[15px] text-adm-ink";
const label = "mb-1 block text-sm font-bold";

export function ForwardDialog({ t }: { t: T }) {
  const close = () => { t.setShowForwardModal(false); t.setForwardMessage(null); };
  return (
    <Dialog
      open={t.showForwardModal}
      onClose={close}
      title="Nachricht weiterleiten"
      footer={
        <>
          <Btn variant="ghost" onClick={close}>Abbrechen</Btn>
          <Btn variant="primary" onClick={t.handleForwardMessage} disabled={t.forwarding || !t.forwardEmail}>{t.forwarding ? "Sende …" : "Weiterleiten"}</Btn>
        </>
      }
    >
      <p className="mb-3 text-sm text-adm-mut">An externe E-Mail-Adresse senden</p>
      {t.forwardMessage && (
        <blockquote className="mb-4 line-clamp-4 rounded-xl bg-adm-bg p-3 text-sm text-adm-mut">
          {String(t.forwardMessage.content || "").replace(/<[^>]*>/g, "").slice(0, 300)}
        </blockquote>
      )}
      <div className="space-y-3">
        <div><label className={label} htmlFor="fw-mail">E-Mail-Adresse des Empfängers *</label><input id="fw-mail" data-autofocus type="email" value={t.forwardEmail} onChange={(e) => t.setForwardEmail(e.target.value)} placeholder="empfaenger@example.com" className={field} /></div>
        <div><label className={label} htmlFor="fw-name">Name (optional)</label><input id="fw-name" value={t.forwardName} onChange={(e) => t.setForwardName(e.target.value)} placeholder="Max Mustermann" className={field} /></div>
        <div><label className={label} htmlFor="fw-note">Notiz (optional)</label><textarea id="fw-note" rows={3} value={t.forwardNote} onChange={(e) => t.setForwardNote(e.target.value)} placeholder="Zusätzliche Nachricht an den Empfänger …" className={cx(field, "py-2")} /></div>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={t.forwardReplyToCustomer} onChange={(e) => t.setForwardReplyToCustomer(e.target.checked)} className="mt-1 h-6 w-6 accent-[var(--adm-teal)]" />
          <span><span className="block text-sm font-bold">Antwort an Kunden</span><span className="block text-xs text-adm-mut">Empfänger antwortet direkt an {t.forwardMessage?.senderEmail}</span></span>
        </label>
      </div>
    </Dialog>
  );
}

export function ShareDialog({ t, open, onClose }: { t: T; open: boolean; onClose: () => void }) {
  const isWa = t.ticket?.channel === "whatsapp";
  const channels: Array<{ key: "auto" | "live" | "email" | "whatsapp"; title: string; hint: string; icon: React.ReactNode }> = [
    { key: "auto", title: "Automatisch", hint: "Smarte Kanalwahl (Live, E-Mail oder WhatsApp)", icon: <SparkleIcon /> },
    { key: "live", title: "Live-Chat", hint: "Im Portal anzeigen", icon: <GlobeIcon /> },
    { key: "email", title: "E-Mail", hint: "Als schöne E-Mail senden", icon: <MailIcon /> },
    ...(isWa ? [{ key: "whatsapp" as const, title: "WhatsApp", hint: "Als WhatsApp-Nachricht", icon: <WhatsAppIcon /> }] : []),
  ];
  const close = () => { onClose(); t.setSelectedArticle(null); };
  return (
    <Dialog
      open={open && !!t.selectedArticle}
      onClose={close}
      title="Artikel teilen"
      footer={
        <>
          <Btn variant="ghost" onClick={close}>Abbrechen</Btn>
          <Btn variant="primary" disabled={t.sharingArticle} onClick={async () => { await t.handleShareArticle(); onClose(); }}>
            <ShareIcon width={18} height={18} />{t.sharingArticle ? "Sende …" : "An Kunde senden"}
          </Btn>
        </>
      }
    >
      {t.selectedArticle && <p className="mb-4 rounded-xl bg-adm-bg p-3 text-sm font-bold">{t.selectedArticle.title}</p>}
      <label className={label} htmlFor="sh-text">Eigener Text (optional)</label>
      <textarea id="sh-text" rows={3} value={t.shareCustomText} onChange={(e) => t.setShareCustomText(e.target.value)} placeholder="Text, der zusammen mit dem Artikel gesendet wird …" className={cx(field, "py-2")} />
      <fieldset className="mt-4">
        <legend className={label}>Versandkanal</legend>
        <div className="space-y-2">
          {channels.map((c) => (
            <label key={c.key} className={cx("flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-3", t.shareChannel === c.key ? "border-adm-teal bg-adm-surface-2" : "border-adm-line")}>
              <input type="radio" name="share-channel" checked={t.shareChannel === c.key} onChange={() => t.setShareChannel(c.key)} className="h-5 w-5 accent-[var(--adm-teal)]" />
              <span className="text-adm-teal dark:text-adm-apricot">{c.icon}</span>
              <span><span className="block text-sm font-bold">{c.title}</span><span className="block text-xs text-adm-mut">{c.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
    </Dialog>
  );
}

export function CustomAiDialog({ t, open, onClose }: { t: T; open: boolean; onClose: () => void }) {
  const hasText = !!t.replyContent.replace(/<[^>]*>/g, "").trim();
  const quick = ["Freundlich", "Entschuldigung", "Weiterleitung", "Geduld"];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Eigene Anweisung an Lena"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Abbrechen</Btn>
          <Btn variant="apricot" disabled={t.aiLoading || !t.customInstruction.trim()} onClick={() => { onClose(); t.handleAiCustom(); }}>
            <SparkleIcon width={18} height={18} />{hasText ? "Text bearbeiten" : "Antwort erstellen"}
          </Btn>
        </>
      }
    >
      {t.messages.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-adm-mut">Kontext</p>
          <div className="space-y-1 rounded-xl bg-adm-bg p-3 text-xs text-adm-mut">
            {t.messages.slice(-2).map((m) => (
              <p key={m.id} className="line-clamp-2">{String(m.content || "").replace(/<[^>]*>/g, "").slice(0, 120)}</p>
            ))}
          </div>
        </div>
      )}
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-adm-mut">Schnellaktionen</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <Btn key={q} variant="soft" onClick={() => t.setCustomInstruction(q)}>{q}</Btn>
        ))}
      </div>
      <label className={label} htmlFor="ai-instr">{hasText ? "Was soll an dem Text geändert werden?" : "Worum soll die Antwort gehen?"}</label>
      <textarea id="ai-instr" data-autofocus rows={4} value={t.customInstruction} onChange={(e) => t.setCustomInstruction(e.target.value)} placeholder="Beschreibe, was du möchtest …" className={cx(field, "py-2")} />
    </Dialog>
  );
}

/** Artikel suchen → Link in die Antwort einfügen oder mit Kunde teilen */
export function ArticlesDialog({ t, open, onClose, onShare }: { t: T; open: boolean; onClose: () => void; onShare: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Artikel suchen">
      <div className="flex items-center gap-2 rounded-2xl border border-adm-line bg-adm-bg px-3">
        <SearchIcon className="text-adm-mut" />
        <input data-autofocus value={t.articleSearchQuery} onChange={(e) => t.handleArticleSearch(e.target.value)} aria-label="Artikel suchen" placeholder="Artikel suchen …" className="h-12 w-full bg-transparent outline-none" />
      </div>
      <p className="mt-3 text-xs text-adm-mut" aria-live="polite">{t.articleSearching ? "Suche …" : t.articleSearchQuery.length >= 2 ? `${t.articleSearchResults.length} Treffer` : "Mindestens 2 Zeichen eingeben"}</p>
      <ul className="mt-2 space-y-2">
        {t.articleSearchResults.map((a) => (
          <li key={a.id} className="rounded-2xl bg-adm-bg p-3">
            <p className="flex items-center gap-2 text-sm font-bold"><BookIcon width={16} height={16} />{a.title}</p>
            {a.excerpt && <p className="mt-1 line-clamp-2 text-xs text-adm-mut">{a.excerpt}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn variant="soft" onClick={() => { t.handleInsertArticle(a); onClose(); }}>Link einfügen</Btn>
              <Btn variant="primary" onClick={() => { t.setSelectedArticle(a); onClose(); onShare(); }}>Mit Kunde teilen</Btn>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Bestätigung vor „Senden & erledigt“: Empfänger, Kanal, Text */
export function ConfirmSendDialog({ t, open, onClose, onConfirm }: { t: T; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const ticket = t.ticket;
  if (!ticket) return null;
  const via = ticket.channel === "whatsapp" ? "WhatsApp" : !t.sendEmail ? "Live-Chat" : "E-Mail";
  const to = ticket.channel === "whatsapp" ? ticket.phone || ticket.customerName : ticket.customerEmail;
  const plain = t.replyContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Jetzt senden und erledigen?"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} data-autofocus>Zurück zum Text</Btn>
          <Btn variant="apricot" disabled={t.sending} onClick={onConfirm}>Senden &amp; erledigt</Btn>
        </>
      }
    >
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-adm-mut">An</dt><dd className="break-all font-bold">{ticket.customerName} · {to}</dd>
        <dt className="text-adm-mut">Kanal</dt><dd className="font-bold">{via}</dd>
        {t.attachments.length > 0 && (<><dt className="text-adm-mut">Anhänge</dt><dd className="font-bold">{t.attachments.length}</dd></>)}
      </dl>
      <div className="max-h-[40dvh] overflow-y-auto rounded-xl border border-adm-line bg-adm-bg p-3 text-sm">{plain || "—"}</div>
      <p className="mt-3 flex items-center gap-2 text-xs text-adm-mut">
        <Pill tone="wait"><SparkleIcon width={14} height={14} />Lena-Text?</Pill> Bitte prüfe Preise, Zeiten und Namen, bevor du sendest. Danach wird die Anfrage auf „Gelöst“ gesetzt.
      </p>
    </Dialog>
  );
}

export function SpamDialog({ t, open, onClose, onDone }: { t: T; open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Als Spam markieren?"
      footer={<Btn variant="ghost" onClick={onClose}>Abbrechen</Btn>}>
      <p className="mb-4 text-sm">Das Ticket wird geschlossen. Soll auch der Absender <strong className="break-all">{t.ticket?.customerEmail}</strong> für künftige Mails blockiert werden?</p>
      <div className="grid gap-2">
        <Btn variant="danger" onClick={async () => { onClose(); await t.handleMarkSpam(true); onDone(); }}>Spam + Absender blockieren</Btn>
        <Btn variant="soft" onClick={async () => { onClose(); await t.handleMarkSpam(false); onDone(); }}>Nur dieses Ticket schließen</Btn>
      </div>
    </Dialog>
  );
}

export function CategoryDialog({ t, open, onClose }: { t: T; open: boolean; onClose: () => void }) {
  const target = t.ticket?.category === "sonstiges" ? "kundenanfrage" : "sonstiges";
  const name = target === "kundenanfrage" ? "Kundenanfrage" : "Sonstiges";
  return (
    <Dialog open={open} onClose={onClose} title={`Als „${name}“ einordnen`} footer={<Btn variant="ghost" onClick={onClose}>Abbrechen</Btn>}>
      <p className="mb-4 text-sm">Soll der Absender für künftige Mails gemerkt werden?</p>
      <div className="grid gap-2">
        <Btn variant="primary" onClick={() => { onClose(); t.handleSetCategory(target, true); }}>Ja, Absender merken</Btn>
        <Btn variant="soft" onClick={() => { onClose(); t.handleSetCategory(target, false); }}>Nur dieses Ticket</Btn>
      </div>
    </Dialog>
  );
}

export function DeleteDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Ticket löschen?" footer={<><Btn variant="ghost" onClick={onClose}>Abbrechen</Btn><Btn variant="danger" onClick={() => { onClose(); onConfirm(); }}>In den Papierkorb</Btn></>}>
      <p className="text-sm">Das Ticket wird in den Papierkorb verschoben und kann dort wiederhergestellt werden.</p>
    </Dialog>
  );
}
