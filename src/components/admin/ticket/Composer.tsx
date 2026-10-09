"use client";

import { useEffect, useState } from "react";
import RichTextEditor from "@/components/editor/LazyRichTextEditor";
import { Btn } from "../ui/Dialog";
import { Pill, cx } from "../ui/Pills";
import { BoltIcon, CheckIcon, ClipIcon, ClockIcon, CloseIcon, GlobeIcon, MailIcon, SendIcon, SparkleIcon, VolumeIcon, VolumeOffIcon, WhatsAppIcon, BookIcon, PencilIcon, ChevronIcon } from "../ui/icons";
import type { useTicketDetail } from "./useTicketDetail";

type T = ReturnType<typeof useTicketDetail>;

const TONES: Array<{ key: string; label: string }> = [
  { key: "formal", label: "Formeller" },
  { key: "friendly", label: "Freundlicher" },
  { key: "short", label: "Kürzer" },
  { key: "detailed", label: "Ausführlicher" },
];

function Chip({ children, onClick, disabled, tone = "soft", pressed }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "soft" | "lena"; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cx(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold disabled:opacity-50",
        tone === "lena" ? "bg-adm-wait-bg text-adm-wait-ink" : "bg-adm-surface-2 text-adm-ink hover:brightness-95"
      )}
    >
      {children}
    </button>
  );
}

export default function Composer({
  t,
  onSendDone,
  onLater,
  onOpenCustom,
  onOpenArticles,
}: {
  t: T;
  onSendDone: () => void;
  onLater: () => void;
  onOpenCustom: () => void;
  onOpenArticles: () => void;
}) {
  const { ticket } = t;
  const [toolsOpen, setToolsOpen] = useState(false);
  // Handy: Antwortbereich eingeklappt (eine Zeile), öffnet sich bei Tippen, Lena-Vorschlag oder Text
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (t.lenaPrefilled || t.aiLoading) setMobileOpen(true);
  }, [t.lenaPrefilled, t.aiLoading]);
  if (!ticket) return null;
  const empty = !t.replyContent.replace(/<[^>]*>/g, "").trim();
  const isWhatsApp = ticket.channel === "whatsapp";
  const replies = t.quickReplies.length > 0 ? t.quickReplies : t.defaultQuickReplies;

  const channelBadge = isWhatsApp ? (
    <Pill tone="ok"><WhatsAppIcon width={14} height={14} />WhatsApp</Pill>
  ) : !t.sendEmail ? (
    <Pill tone="work"><GlobeIcon width={14} height={14} />Nur Live-Chat</Pill>
  ) : t.customerPresence.online ? (
    <Pill tone="ok"><span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />Live-Chat · online</Pill>
  ) : (
    <Pill tone="new"><MailIcon width={14} height={14} />E-Mail · offline</Pill>
  );

  const iconBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-adm-mut hover:bg-adm-surface-2";

  return (
    <div
      id="reply-area"
      className={cx("adm-composer relative max-h-[64dvh] shrink-0 overflow-y-auto border-t border-adm-line bg-adm-surface px-4 pb-3 pt-3 lg:px-6", t.isDragging && "outline-dashed outline-2 outline-adm-teal")}
      onDragOver={t.handleDragOver}
      onDragLeave={t.handleDragLeave}
      onDrop={t.handleDrop}
    >
      {t.isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-adm-surface/90 text-lg font-bold text-adm-teal">Datei hier ablegen</div>
      )}

      {/* Handy eingeklappt: eine Zeile */}
      {!mobileOpen && (
        <div className="adm-safe-bottom flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => { setMobileOpen(true); setTimeout(() => document.querySelector<HTMLElement>("#reply-area .ProseMirror")?.focus(), 80); }}
            className="min-h-12 flex-1 rounded-full bg-adm-surface-2 px-4 text-left text-[15px] text-adm-mut"
          >
            Antwort schreiben …
          </button>
          <Btn variant="soft" onClick={() => { setMobileOpen(true); t.requestLena(true); }} className="px-4" aria-label="Lena-Vorschlag erstellen"><SparkleIcon width={18} height={18} />Lena</Btn>
          <Btn variant="soft" onClick={onLater} className="px-3" aria-label="Später erinnern"><ClockIcon width={18} height={18} /></Btn>
        </div>
      )}

      <div className={cx(!mobileOpen && "hidden lg:block")}>
        {/* Lena-Zeile */}
        <div className="mb-2 flex items-center gap-2" aria-live="polite">
          {t.aiLoading && empty ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-adm-wait-ink">
              <SparkleIcon className="animate-pulse" /> Lena schreibt einen Vorschlag …
            </span>
          ) : t.lenaPrefilled ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-extrabold uppercase tracking-wider text-adm-apricot-ink">
              <SparkleIcon width={16} height={16} /> Lena-Entwurf<span className="hidden xl:inline">&nbsp;– bitte prüfen</span>
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-adm-mut">Antwort</span>
          )}
          {(t.lenaPrefilled || t.aiLoading) && (
            <span className="ml-auto flex gap-2">
              <Chip onClick={() => t.handleAiRewrite("short")} disabled={t.aiLoading || empty}>Kürzer</Chip>
              <span className="hidden sm:contents"><Chip onClick={() => t.handleAiRewrite("formal")} disabled={t.aiLoading || empty}>Förmlicher</Chip></span>
              <Chip onClick={() => t.requestLena(true)} disabled={t.aiLoading}>Neu</Chip>
            </span>
          )}
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Antwortbereich einklappen" className={cx(iconBtn, "lg:hidden", !(t.lenaPrefilled || t.aiLoading) && "ml-auto")}><ChevronIcon /></button>
        </div>

        <RichTextEditor value={t.replyContent} onChange={(v: string) => { t.setReplyContent(v); }} variant="ticket" placeholder="Antwort schreiben …" />

        {/* Anhänge */}
        {t.attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Anhänge zur Antwort">
            {t.attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-2 rounded-full border border-adm-line bg-adm-bg py-1 pl-3 text-sm">
                <ClipIcon width={16} height={16} />
                <span className="max-w-[160px] truncate">{att.filename}</span>
                <button type="button" onClick={() => t.removeAttachment(att.id)} aria-label={`${att.filename} entfernen`} className="flex h-11 w-11 items-center justify-center rounded-full text-adm-mut hover:text-adm-danger-ink">
                  <CloseIcon width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Zeile A: Schnellantworten + Werkzeuge */}
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 lg:flex-nowrap">
          <div className="adm-scroll-x -mx-4 flex min-w-0 flex-1 basis-full gap-2 overflow-x-auto px-4 lg:mx-0 lg:basis-auto lg:px-0" role="group" aria-label="Schnellantworten">
            {replies.map((qr) => (
              <Chip key={qr.id} onClick={() => { t.setReplyContent(qr.content); t.setLenaPrefilled(false); }}>
                {qr.title}
              </Chip>
            ))}
          </div>
          <input ref={t.fileInputRef} type="file" multiple onChange={t.handleFileUpload} className="hidden" aria-hidden="true" tabIndex={-1} />
          <button type="button" onClick={() => t.fileInputRef.current?.click()} disabled={t.uploading} aria-label="Datei anhängen" title="Datei anhängen" className={cx(iconBtn, "disabled:opacity-50")}>
            <ClipIcon className={t.uploading ? "animate-pulse" : ""} />
          </button>
          <button type="button" onClick={onOpenArticles} aria-label="Artikel suchen und einfügen" title="Artikel suchen" className={iconBtn}>
            <BookIcon />
          </button>
          <button
            type="button"
            onClick={() => { const v = !t.soundEnabled; t.setSoundEnabled(v); localStorage.setItem("admin:sound-enabled", String(v)); }}
            aria-pressed={t.soundEnabled}
            aria-label={t.soundEnabled ? "Ton bei neuen Nachrichten: an" : "Ton bei neuen Nachrichten: aus"}
            title={t.soundEnabled ? "Ton aktiv" : "Ton stumm"}
            className={cx(iconBtn, t.soundEnabled && "!text-adm-teal dark:!text-adm-apricot")}
          >
            {t.soundEnabled ? <VolumeIcon /> : <VolumeOffIcon />}
          </button>
          <button type="button" onClick={() => setToolsOpen((o) => !o)} aria-expanded={toolsOpen} aria-label="Lena-Werkzeuge" title="Lena-Werkzeuge" className={cx(iconBtn, "!text-adm-wait-ink", toolsOpen && "bg-adm-wait-bg")}>
            <SparkleIcon />
          </button>
        </div>

        {toolsOpen && (
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl bg-adm-bg p-3" role="group" aria-label="Lena-Werkzeuge">
            <Chip tone="lena" onClick={() => t.requestLena(true)} disabled={t.aiLoading}><BoltIcon width={16} height={16} />Antwort generieren</Chip>
            <Chip tone="lena" onClick={t.handleAiCorrect} disabled={t.aiLoading || empty}><CheckIcon width={16} height={16} />Korrigieren</Chip>
            {TONES.map((tone) => (
              <Chip key={tone.key} tone="lena" onClick={() => t.handleAiRewrite(tone.key)} disabled={t.aiLoading || empty}>{tone.label}</Chip>
            ))}
            <Chip tone="lena" onClick={onOpenCustom} disabled={t.aiLoading}><PencilIcon width={16} height={16} />Eigene Anweisung</Chip>
            <label className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-adm-mut">
              <input type="checkbox" checked={t.lenaAuto} onChange={t.toggleLenaAuto} className="h-6 w-6 accent-[var(--adm-teal)]" />
              Vorschlag automatisch laden
            </label>
          </div>
        )}

        {/* Zeile B: Kanal + Aktionen (Daumenzone) */}
        <div className="adm-safe-bottom mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {channelBadge}
          {!isWhatsApp && (
            <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-adm-mut">
              <input type="checkbox" checked={t.sendEmail} onChange={(e) => t.setSendEmail(e.target.checked)} className="h-6 w-6 accent-[var(--adm-teal)]" />
              <span className="hidden sm:inline">Auch per E-Mail</span><span className="sm:hidden">E-Mail</span>
            </label>
          )}
          <div className="flex w-full items-stretch gap-2 lg:ml-auto lg:w-auto">
            <Btn variant="soft" onClick={onLater} className="px-4" aria-label="Später erinnern"><ClockIcon width={18} height={18} /><span className="hidden sm:inline">Später</span></Btn>
            <Btn variant="primary" disabled={t.sending || empty} onClick={() => t.handleSendReply()} className="flex-1 lg:flex-none">
              <SendIcon width={18} height={18} />
              {t.sending ? "Senden …" : "Senden"}
            </Btn>
            <Btn variant="apricot" disabled={t.sending || empty} onClick={onSendDone} className="flex-[1.6] whitespace-nowrap px-3 lg:flex-none lg:px-4">
              <CheckIcon width={18} height={18} />
              Senden &amp; erledigt
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
