import { kv } from './kv';

// Einmalige Migration (26.10.2026): neue Kundennummer 0651 603 443 42 statt der alten
// Kundennummer 0651 493 688 19 und der alten Studionummer 0651 308524 – in allen Inhalten im KV
// (Hilfe-Artikel, Wissensdatenbank der KI, Schnellantworten). Die Geschäftsnummer
// 0651 603 442 05 und die WhatsApp-Bot-Nummer bleiben unberührt.
export const PHONE_NEW = '0651 603 443 42';
export const PHONE_NEW_HREF = 'tel:+4965160344342';
const PHONE_HREF_PREV = /tel:\+?(?:49|0)651(?:49368819|308524)\b/g;
const PHONE_PREV = /(?:\+49[\s-]?(?:\(0\)\s?)?|0049[\s-]?|0)651[\s/-]*(?:4\s?9\s?3\s?6\s?8\s?8\s?1\s?9|3\s?0\s?8\s?5\s?2\s?4)\b/g;

const FLAG = 'mig:nummer26';

export function replacePhone(text: string): string {
  return text.replace(PHONE_HREF_PREV, PHONE_NEW_HREF).replace(PHONE_PREV, PHONE_NEW);
}

// Nur String-Felder ersetzen; liefert die geänderten Felder (leer = nichts zu tun).
export function changedFields(row: Record<string, unknown> | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    if (typeof v !== 'string') continue;
    const next = replacePhone(v);
    if (next !== v) out[k] = next;
  }
  return out;
}

let done = false;

export async function runPhoneMigration(): Promise<void> {
  if (done) return;
  done = true;
  const got = await kv.set(FLAG, String(Date.now()), { nx: true });
  if (got !== 'OK') return;   // schon gelaufen
  try {
    for (const [set, prefix] of [['articles:ids', 'article:'], ['knowledge:ids', 'knowledge:']] as const) {
      const ids: string[] = await kv.smembers(set);
      for (const id of ids) {
        const fields = changedFields(await kv.hgetall(`${prefix}${id}`));
        if (Object.keys(fields).length) await kv.hset(`${prefix}${id}`, fields);
      }
    }
    const replies = await kv.get<unknown[]>('admin:quick-replies');
    if (Array.isArray(replies)) {
      const next = JSON.parse(replacePhone(JSON.stringify(replies)));
      if (JSON.stringify(next) !== JSON.stringify(replies)) await kv.set('admin:quick-replies', next);
    }
  } catch (e) {
    console.error('phone migration failed', e);
    await kv.del(FLAG).catch(() => {});   // beim nächsten Mal erneut versuchen
    done = false;
  }
}
