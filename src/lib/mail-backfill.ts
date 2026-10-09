// Einmalige Nachsortierung: E-Mail-Tickets ohne Einordnung (vor 5169af6 angelegt) nachträglich einordnen.
// Idempotent: jedes bearbeitete Ticket bekommt ein category-Feld und wird beim nächsten Lauf übersprungen.
// Es wird nichts gelöscht. Die Original-Header sind nicht gespeichert, daher greifen nur die Absender-/Betreff-/Anhang-Regeln.
import { kv } from './kv';
import { getTicket, getTicketMessages, Ticket } from './tickets';
import { classifyEmail, MailClassification } from './mail-classifier';
import { loadLearnedSenders } from './mail-classifier-io';

export interface BackfillResult {
  dryRun: boolean;
  totalTickets: number;
  emailWithoutCategory: number;
  processed: number;
  kundenanfrage: number;
  sonstiges: number;
  keptBecauseAnswered: number;
  remaining: number;
  timedOut: boolean;
  /** Betreff-freie Kurzgründe der Einordnung "Sonstiges" mit Anzahl, z. B. "Newsletter-Header: 12" */
  sonstigesByReason: Record<string, number>;
}

const CONCURRENCY = 8;

export async function backfillMailCategories(options: { dryRun?: boolean; deadline?: number; limit?: number } = {}): Promise<BackfillResult> {
  const dryRun = options.dryRun ?? false;
  const deadline = options.deadline ?? Date.now() + 240_000;
  const ids: string[] = await kv.smembers('tickets:ids');
  const learned = await loadLearnedSenders();

  const result: BackfillResult = {
    dryRun,
    totalTickets: ids.length,
    emailWithoutCategory: 0,
    processed: 0,
    kundenanfrage: 0,
    sonstiges: 0,
    keptBecauseAnswered: 0,
    remaining: 0,
    timedOut: false,
    sonstigesByReason: {},
  };

  // Kandidaten finden (nur Hash-Lesen, keine Nachrichten)
  const candidates: Ticket[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    if (Date.now() > deadline) { result.timedOut = true; break; }
    const batch = await Promise.all(ids.slice(i, i + 50).map((id) => getTicket(id)));
    for (const t of batch) {
      if (t && t.channel === 'email' && !t.category && !t.isSpam && !t.deletedAt) candidates.push(t);
    }
  }
  result.emailWithoutCategory = candidates.length;
  const todo = options.limit ? candidates.slice(0, options.limit) : candidates;

  async function handle(ticket: Ticket) {
    const messages = await getTicketMessages(ticket.id);
    const first = messages.find((m) => m.sender === 'customer');
    // Sobald das Team geantwortet hat, ist es eine echte Konversation → bleibt Kundenanfrage
    const answered = messages.some((m) => m.sender === 'admin');
    let classification: MailClassification;
    if (answered || !first) {
      classification = { category: 'kundenanfrage', reason: answered ? 'Team hat geantwortet' : 'Im Zweifel Kundenanfrage', source: 'default' };
      if (answered) result.keptBecauseAnswered++;
    } else {
      classification = await classifyEmail(
        {
          fromEmail: ticket.customerEmail,
          fromName: ticket.customerName,
          subject: ticket.subject,
          text: first.content.replace(/<[^>]*>/g, ' '),
          headers: {},
          attachmentNames: (first.attachments || []).map((a) => a.filename || ''),
        },
        { learned } // ohne KI: Nachsortierung soll kostenlos und deterministisch sein
      );
    }
    if (!dryRun) {
      // updatedAt bleibt unverändert, damit Sortierung und Alter der Tickets erhalten bleiben
      await kv.hset(`ticket:${ticket.id}`, {
        category: classification.category,
        categoryReason: classification.reason,
        categorySource: classification.source,
        ...(classification.important ? { important: true } : {}),
      });
    }
    result.processed++;
    if (classification.category === 'sonstiges') {
      result.sonstiges++;
      const key = classification.reason.replace(/\s*\(.*\)$/, '');
      result.sonstigesByReason[key] = (result.sonstigesByReason[key] || 0) + 1;
    } else {
      result.kundenanfrage++;
    }
  }

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() > deadline) { result.timedOut = true; break; }
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map((t) => handle(t).catch((e) => console.error('[Backfill] Ticket übersprungen:', e?.message)))
    );
  }
  result.remaining = dryRun ? result.emailWithoutCategory : result.emailWithoutCategory - result.processed;
  return result;
}

/** Aufbewahrung: Sonstiges-Tickets älter als N Tage in den Papierkorb (Soft-Delete, wiederherstellbar). Nur aktiv, wenn days > 0. */
export async function trashOldSonstiges(days: number, options: { dryRun?: boolean } = {}): Promise<{ eligible: number; trashed: number }> {
  if (!(days > 0)) return { eligible: 0, trashed: 0 };
  const cutoff = Date.now() - days * 86_400_000;
  const ids: string[] = await kv.smembers('tickets:ids');
  let eligible = 0;
  let trashed = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const batch = await Promise.all(ids.slice(i, i + 50).map((id) => getTicket(id)));
    for (const t of batch) {
      if (!t || t.category !== 'sonstiges' || t.deletedAt || t.important) continue;
      if (new Date(t.updatedAt || t.createdAt).getTime() > cutoff) continue; // seit N Tagen keine Aktivität
      eligible++;
      if (!options.dryRun) {
        await kv.hset(`ticket:${t.id}`, { deletedAt: new Date().toISOString() });
        trashed++;
      }
    }
  }
  return { eligible, trashed };
}
