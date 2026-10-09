"use client";

import MemberSearch from "@/components/MemberSearch";
import { Btn } from "../ui/Dialog";
import { Avatar, Pill, cx } from "../ui/Pills";
import { AlertIcon, CheckIcon, CloseIcon, LockIcon, PencilIcon, ShareIcon, StarIcon, TrashIcon, BookIcon, SearchIcon, ExternalIcon } from "../ui/icons";
import type { useTicketDetail } from "./useTicketDetail";

type T = ReturnType<typeof useTicketDetail>;

function Card({ title, children, className, id, aside }: { title: string; children: React.ReactNode; className?: string; id?: string; aside?: React.ReactNode }) {
  return (
    <section id={id} aria-label={title} className={cx("rounded-2xl border border-adm-line bg-adm-surface p-4", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="adm-mono text-xs font-medium uppercase tracking-[0.08em] text-adm-mut">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function lastSeenText(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days < 7) return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  return new Date(iso).toLocaleDateString("de-DE");
}

const selectCls = "min-h-11 w-full rounded-xl border border-adm-line bg-adm-surface px-3 text-[15px] font-semibold text-adm-ink";

/** Kundenkarte (rechte Spalte): Kunde, Online-Status, E-Mail ändern, Magicline-Mitglied, Zeitstempel, Bewertung */
export function CustomerCard({ t }: { t: T }) {
  const { ticket } = t;
  if (!ticket) return null;
  return (
    <div className="space-y-3">
      <Card title="Kunde">
        <div className="flex items-center gap-3">
          <Avatar name={ticket.customerName} size={48} />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{ticket.customerName}</p>
            <p className="flex items-center gap-1.5 text-xs text-adm-mut">
              <span aria-hidden="true" className={cx("h-2 w-2 rounded-full", t.customerPresence.online ? "animate-pulse bg-green-500" : "bg-adm-mut")} />
              {t.customerPresence.online ? "Online" : t.customerPresence.lastSeen ? `Offline · zuletzt ${lastSeenText(t.customerPresence.lastSeen)}` : "Offline"}
            </p>
          </div>
        </div>

        <div className="mt-3 text-sm">
          {t.editingEmail ? (
            <div className="flex items-center gap-1">
              <input
                type="email"
                value={t.editedEmail}
                onChange={(e) => t.setEditedEmail(e.target.value)}
                aria-label="E-Mail-Adresse"
                placeholder="E-Mail-Adresse"
                data-autofocus
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-adm-line bg-adm-surface px-3"
              />
              <button type="button" onClick={t.handleSaveEmail} disabled={t.savingEmail} aria-label="E-Mail speichern" className="flex h-11 w-11 items-center justify-center rounded-full bg-adm-ok-bg text-adm-ok-ink">
                <CheckIcon />
              </button>
              <button type="button" onClick={() => t.setEditingEmail(false)} aria-label="Abbrechen" className="flex h-11 w-11 items-center justify-center rounded-full text-adm-mut hover:bg-adm-surface-2">
                <CloseIcon />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <a href={`mailto:${ticket.customerEmail}`} className="break-all font-semibold text-adm-teal underline-offset-2 hover:underline dark:text-adm-apricot">
                {ticket.customerEmail}
              </a>
              <button
                type="button"
                onClick={() => { t.setEditedEmail(ticket.customerEmail); t.setEditingEmail(true); }}
                aria-label="E-Mail-Adresse ändern"
                title="E-Mail ändern"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-adm-mut hover:bg-adm-surface-2"
              >
                <PencilIcon width={18} height={18} />
              </button>
            </div>
          )}
          {ticket.phone && <p className="adm-mono mt-1 text-xs text-adm-mut">{ticket.phone}</p>}
        </div>

        {t.humanRequested && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-adm-new-bg px-3 py-2 text-xs font-bold text-adm-new-ink">
            <AlertIcon width={16} height={16} /> Mensch angefordert
          </p>
        )}
      </Card>

      <Card title="Magicline-Mitglied">
        {/* Bestehende Komponente mit hellem Eigen-Design → als helle Insel, damit sie im Dunkelmodus lesbar bleibt */}
        <div className="adm-light-island rounded-xl bg-white p-3 text-[#14252d]" style={{ colorScheme: "light" }}>
          <MemberSearch initialEmail={ticket.customerEmail} initialPhone={ticket.phone} compact={true} />
        </div>
      </Card>

      <Card title="Zeitstempel">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-2"><dt className="text-adm-mut">Erstellt</dt><dd className="adm-mono text-xs">{new Date(ticket.createdAt).toLocaleString("de-DE")}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-adm-mut">Aktualisiert</dt><dd className="adm-mono text-xs">{new Date(ticket.updatedAt).toLocaleString("de-DE")}</dd></div>
          {ticket.assignedTo && <div className="flex justify-between gap-2"><dt className="text-adm-mut">Zugewiesen</dt><dd className="text-xs font-semibold">{ticket.assignedTo}</dd></div>}
        </dl>
      </Card>

      {ticket.status === "closed" && (
        <Card title="Kundenbewertung" aside={<StarIcon width={18} height={18} className="text-yellow-500" />}>
          {t.ticketRating ? (
            <div className="text-center">
              <p className="text-2xl text-yellow-500" aria-label={`${t.ticketRating.rating} von 5 Sternen`}>
                {"★".repeat(t.ticketRating.rating)}
                <span className="text-adm-line">{"★".repeat(5 - t.ticketRating.rating)}</span>
              </p>
              <p className="text-xs text-adm-mut">{t.ticketRating.rating}/5 Sterne</p>
              {t.ticketRating.comment && <p className="mt-2 text-xs italic text-adm-mut">&quot;{t.ticketRating.comment}&quot;</p>}
            </div>
          ) : t.ratingRequested ? (
            <p className="flex items-center justify-center gap-2 text-sm text-adm-ok-ink"><CheckIcon width={18} height={18} />Bewertungsanfrage gesendet</p>
          ) : (
            <Btn variant="soft" className="w-full" onClick={t.handleRequestRating} disabled={t.requestingRating}>
              <StarIcon width={18} height={18} />{t.requestingRating ? "Wird gesendet …" : "Bewertung anfordern"}
            </Btn>
          )}
        </Card>
      )}
    </div>
  );
}

// Tag-Farben: [hell, dunkel] – beide mit ≥ 4,5:1 Kontrast auf der jeweiligen Fläche
const TAG_TONES: Record<string, [string, string]> = {
  red: ["#b42318", "#f19a9a"], yellow: ["#8a5a00", "#e8c35a"], orange: ["#a8480a", "#f0a46b"], purple: ["#6d28d9", "#c4a8f5"],
  green: ["#166534", "#7fd69b"], blue: ["#1d4ed8", "#9cc0f7"], teal: ["#0f766e", "#6fd3c6"], gray: ["#4b5563", "#b8c2c8"],
};

/** Steuerung: Status, Priorität, KI, Tags, Notizen, passende Artikel */
export function ControlsPanel({ t, onShare, onSearchArticles }: { t: T; onShare: () => void; onSearchArticles: () => void }) {
  const { ticket } = t;
  if (!ticket) return null;
  const ai = ticket.aiStatus;
  return (
    <div className="space-y-3">
      <Card title="Status & Priorität">
        <label className="block text-xs font-bold text-adm-mut" htmlFor="adm-status">Status</label>
        <select id="adm-status" value={ticket.status} onChange={(e) => t.handleStatusChange(e.target.value as typeof ticket.status)} className={selectCls}>
          <option value="open">Offen</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="resolved">Gelöst</option>
          <option value="closed">Geschlossen (sendet Bewertungsanfrage)</option>
        </select>
        <label className="mt-3 block text-xs font-bold text-adm-mut" htmlFor="adm-prio">Priorität</label>
        <select id="adm-prio" value={ticket.priority} onChange={(e) => t.handlePriorityChange(e.target.value as typeof ticket.priority)} className={selectCls}>
          <option value="low">Niedrig</option>
          <option value="medium">Normal</option>
          <option value="high">Hoch</option>
        </select>
      </Card>

      <Card
        title="Lena (KI-Antworten)"
        className={cx(ai === "active" && "!border-adm-wait-ink/40 !bg-adm-wait-bg", ai === "escalated" && "!bg-adm-new-bg")}
        aside={ai === "escalated" ? <Pill tone="new">Eskaliert</Pill> : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {ai === "active" ? "Lena antwortet automatisch" : ai === "escalated" ? "Kunde wünscht Mitarbeiter" : "Automatik aus"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={ai === "active"}
            aria-label="Lena antwortet automatisch"
            onClick={t.handleAIStatusToggle}
            disabled={t.aiStatusLoading}
            className="flex h-11 w-14 items-center justify-center disabled:opacity-50"
          >
            <span className={cx("relative inline-flex h-7 w-12 items-center rounded-full transition", ai === "active" ? "bg-adm-teal" : "bg-adm-line")}>
              <span className={cx("inline-block h-5 w-5 rounded-full bg-white transition-transform", ai === "active" ? "translate-x-6" : "translate-x-1")} />
            </span>
          </button>
        </div>
        {ai === "escalated" && <p className="mt-1 text-xs">Der Kunde hat um einen menschlichen Mitarbeiter gebeten.</p>}
      </Card>

      <Card title="Tags">
        <div className="flex flex-wrap gap-2">
          {t.availableTags.map((tag) => {
            const on = ticket.tags?.includes(tag.id);
            const [lightC, darkC] = TAG_TONES[tag.color] || TAG_TONES.gray;
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={!!on}
                onClick={() => t.handleTagToggle(tag.id)}
                disabled={t.savingTags}
                style={{ "--tag": lightC, "--tag-d": darkC } as React.CSSProperties}
                className={cx(
                  "min-h-11 rounded-full border px-4 text-sm font-bold disabled:opacity-50",
                  on ? "border-[var(--tag)] bg-[var(--tag)] text-white" : "border-current text-[var(--tag)] dark:text-[var(--tag-d)]"
                )}
              >
                {tag.name}
              </button>
            );
          })}
          {t.availableTags.length === 0 && <p className="text-sm text-adm-mut">Keine Tags verfügbar</p>}
        </div>
      </Card>

      <Card id="notes-section" title="Interne Notizen" aside={<LockIcon width={16} height={16} className="text-adm-mut" />}>
        <label className="sr-only" htmlFor="adm-note">Neue interne Notiz</label>
        <textarea
          id="adm-note"
          value={t.newNoteContent}
          onChange={(e) => t.setNewNoteContent(e.target.value)}
          rows={2}
          placeholder="Notiz nur für das Team …"
          className="w-full rounded-xl border border-adm-line bg-adm-bg p-3 text-[15px]"
        />
        <Btn variant="primary" className="mt-2 w-full" onClick={t.handleAddNote} disabled={t.savingNote || !t.newNoteContent.trim()}>
          {t.savingNote ? "Speichern …" : "Notiz hinzufügen"}
        </Btn>
        <ul className="mt-3 space-y-2">
          {t.ticketNotes.map((n) => (
            <li key={n.id} className="rounded-xl bg-adm-bg p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.content}</p>
              <p className="mt-1 flex items-center justify-between gap-2 text-xs text-adm-mut">
                <span>{n.createdBy} · {new Date(n.createdAt).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <button type="button" onClick={() => t.handleDeleteNote(n.id)} aria-label="Notiz löschen" className="flex h-11 w-11 items-center justify-center rounded-full text-adm-danger-ink hover:bg-adm-danger-bg">
                  <TrashIcon width={16} height={16} />
                </button>
              </p>
            </li>
          ))}
          {t.ticketNotes.length === 0 && <li className="text-sm text-adm-mut">Noch keine Notizen</li>}
        </ul>
      </Card>

      <Card
        id="relevant-articles"
        title="Passende Artikel"
        aside={
          <button type="button" onClick={onSearchArticles} aria-label="Artikel suchen" className="flex h-11 w-11 items-center justify-center rounded-full text-adm-mut hover:bg-adm-surface-2">
            <SearchIcon width={18} height={18} />
          </button>
        }
      >
        {t.articlesLoading ? (
          <p className="py-3 text-center text-sm text-adm-mut">Lädt …</p>
        ) : t.relevantArticles.length === 0 ? (
          <p className="py-3 text-center text-sm text-adm-mut">Keine passenden Artikel gefunden</p>
        ) : (
          <ul className="space-y-2">
            {t.relevantArticles.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-xl bg-adm-bg p-2 pl-3">
                <span className="min-w-0 flex-1 text-sm font-semibold">
                  <span className="line-clamp-2">{a.title}</span>
                  {a.category && <span className="block text-xs font-normal text-adm-mut">{a.category}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => { t.setSelectedArticle(a); onShare(); }}
                  aria-label={`„${a.title}“ mit Kunde teilen`}
                  title="Mit Kunde teilen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-adm-teal text-adm-on-teal"
                >
                  <ShareIcon width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <a href="/admin/articles" target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-adm-mut hover:text-adm-ink">
          <BookIcon width={16} height={16} /> Alle Artikel <ExternalIcon width={14} height={14} /><span className="sr-only">(neuer Tab)</span>
        </a>
      </Card>
    </div>
  );
}
